const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const service = require('../../services')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const Redisquery = require("../../queries/redis/query");
const { redis } = require("googleapis/build/src/apis/redis");
const PubNub = require("../../common/pubnub");
const common = require("../../common");
const { redisClient } = require('../../connections/reddis')
const { startCronJob } = require("../../common/cronjob");
const { scheduleRide } = require("../../common/scheduleRide");
const moment = require('moment');
const { sendNotification } = require('../../connections/firebase')
const Stripe = require('stripe')
const formateCode = (code) => code.replace('+', '')
const { stopCronJob } = require("../../common/cronjob");
const { stubFalse } = require("lodash");
const StripeKey = process.env.STRIPE_SECRET_KEY

const stripe = new Stripe(StripeKey);

async function storePlace(id, placeName) {
  const user = await Queries.findOne(Model.User, { _id: id })
  if (!user) throw new Error("User not found");

  const normalized = placeName.trim().toLowerCase();
  const idx = user.popularPlaces.findIndex(
    (p) => p.name.toLowerCase() === normalized
  );

  if (idx !== -1) {
    user.popularPlaces[idx].count += 1;
  } else {
    user.popularPlaces.push({ name: placeName, count: 1 });
  }

  user.popularPlaces.sort((a, b) => b.count - a.count);

  if (user.popularPlaces.length > 3) {
    user.popularPlaces = user.popularPlaces.slice(0, 3);
  }

  await user.save();
  return user.popularPlaces;
}



module.exports.UpdateLocation = async (req, res, next) => {
  try {

    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { lng, lat } = req.body || {};

    if (!lng || !lat) return res.error(400, common.constants.RESPONSE_MESSAGES.LAT_LNG);
    const updateLocation = await Redisquery.updateLocation(auth?._id.toString(), lng, lat)

    return res.success(common.constants.RESPONSE_MESSAGES.UPDATE_LOC);

  } catch (error) {
    next(error);
  }
};

module.exports.Top_3_places = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { lng, lat, keywords } = req.query || {};
    if (lng === undefined || lng === null || lng === 'null' || lat === undefined || lat === null || lat === "null") {
      return res.error(400, "latitude and longitude are required");
    }

    const user = await Queries.findOne(Model.User, { _id: auth?._id }, "popularPlaces");

    if (user && user.popularPlaces && user.popularPlaces.length > 0) {
      const formattedData = user.popularPlaces.map((p) => ({
        formattedAddress: p.formattedAddress,
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      return res.success("Get popular places successfully", formattedData);
    }

    const nearbyData = await functions.getNearbyPlaces(lat, lng, keywords);

    const formattedData = nearbyData.slice(0, 4).map((item) => ({
      formattedAddress: item.formattedAddress,
      latitude: item.location?.latitude,
      longitude: item.location?.longitude,
    }));

    return res.success("Get nearby places successfully", formattedData);
  } catch (error) {
    next(error);
  }
};



module.exports.SearchDestination = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { lng, lat, keywords } = req.query || {};
    if (
      lng === undefined || lng === null || lng === "null" ||
      lat === undefined || lat === null || lat === "null" ||
      !keywords || keywords === ""
    ) {
      return res.error(400, "All Field are required");
    }

    const rowData = await functions.getAutocomplete(keywords, lat, lng);

    const mappedData = rowData
      .slice(0, 8) // ✅ take max 8 items
      .map(item => {
        const p = item.placePrediction || {};
        return {
          destination: p.text?.text || "",
          placeId: p.placeId || "",
          distanceMeters: p.distanceMeters || null,
          showPlace: p.structuredFormat?.mainText?.text || ""
        };
      });

    return res.success("Get Near places successfully", mappedData);
  } catch (error) {
    next(error);
  }
};


module.exports.GetNearDriver = async (req, res, next) => {
  try {

    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { lng, lat, vehicleType } = req.query || {};
    if (!lng || !lat) return res.error(400, "latitude and Longitude are required");
    console.log("get near by driver-------------------", vehicleType)

    const GetData = await Redisquery.GetallNearByDriver(parseFloat(lng), parseFloat(lat), vehicleType)
    console.log("get near by driver 2-------------------", GetData)

    return res.success("Near Driver getting successfully", GetData);

  } catch (error) {
    next(error);
  }
};

function validateBody(req) {
  const { plng, plat, dlng, dlat } = req.body || {};
  if (![plng, plat, dlng, dlat].every(v => v !== undefined && v !== null && v !== '')) {
    const e = new Error("Pickup and Drop latitude and Longitude are required");
    e.statusCode = 400;
    throw e;
  }
  return {
    plng: parseFloat(plng),
    plat: parseFloat(plat),
    dlng: parseFloat(dlng),
    dlat: parseFloat(dlat),
  };
}

async function getVehicleRules() {
  let data = await Redisquery.GetItem("BOOKINGPRICE");
  if (!data) {
    data = await Queries.findAll(Model.Admin, { type: "BOOKINGPRICE" });
    await Redisquery.SetItem("BOOKINGPRICE", data);
  }
  return Array.isArray(data) ? data : [];
}

async function getTripDistance(plat, plng, dlat, dlng) {
  const resp = await functions.getDistanceAndTime(plat, plng, dlat, dlng);
  const el = resp?.rows?.[0]?.elements?.[0];
  if (!el || el.status !== "OK") {
    const e = new Error("Unable to calculate distance");
    e.statusCode = 400;
    throw e;
  }
  const timeMin = Math.round(el.duration.value / 60);
  const distanceKm = el.distance.value / 1000;
  const distanceMiles = el.distance.value / 1609.34;
  return { distanceKm, distanceMiles, timeMin };
}

async function getNearbyDriversWithMeta(plng, plat, radiusKm = 50, limit = 100) {
  const client = redisClient();
  if (!client) throw new Error("Redis not initialized");
  const raw = await client.sendCommand([
    "GEOSEARCH", "driver_location",
    "FROMLONLAT", String(plng), String(plat),
    "BYRADIUS", String(radiusKm), "km",
    "ASC", "WITHDIST", "WITHCOORD", "COUNT", String(limit)
  ]);
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const multi = client.multi();
  const parsed = raw.map(row => {
    const id = row?.[0];
    const distanceKm = parseFloat(row?.[1] || 0);
    const distanceMiles = distanceKm * 0.621371;
    if (id) multi.hGetAll(`driver_meta:${id}`);
    return { id, distanceKm, distanceMiles };
  });
  const metas = await multi.exec();
  return parsed.map((p, i) => ({ ...p, meta: metas?.[i] || {} }));
}

function groupByVehicleType(drivers) {
  const grouped = {};
  for (const d of drivers) {
    const status = String(d.meta?.status || "").toUpperCase();
    if (!["AVAILABLE", "IDLE", "ONLINE"].includes(status)) continue;
    const type = d.meta?.vehicleType;
    if (!type) continue;
    if (!grouped[type]) grouped[type] = { count: 0, nearest: null };
    grouped[type].count++;
    if (!grouped[type].nearest || d.distanceKm < grouped[type].nearest.distanceKm) {
      grouped[type].nearest = { driverId: d.id, distanceKm: d.distanceKm };
    }
  }
  return grouped;
}

function getSpeedForType(type) {
  const map = { Bike: 40, Auto: 30, Cab: 50 };
  return map[type] || 50;
}

function buildFareOption(v, grouped, tripDistance, surgeMultiplier, tollFee) {
  const type = v.VehicalType;
  if (!grouped[type]) return null;
  const nearest = grouped[type].nearest;
  const speed = getSpeedForType(type);
  const etaMin = Math.max(1, Math.round((nearest.distanceKm / speed) * 60));
  const tripTimeMin = tripDistance.timeMin;
  console.log("drop time calculation", { nearest, speed, etaMin, tripTimeMin })
  const dropTime = moment().clone().add(etaMin + tripTimeMin, "minutes").format("hh:mm A");
  const base = Number(v.baseprice || 0);
  const distPrice = Number(v.distaceprice || 0) * tripDistance.distanceKm;
  // const timePrice = Number(v.timeprice || 0) * tripTimeMin;
  const subtotal = base + distPrice;
  const surge = (Number(surgeMultiplier) - 1) * subtotal;
  const platformFee = (subtotal * Number(v.plateformfees || 0)) / 100;
  const fare = +(subtotal + surge + Number(tollFee || 0) + platformFee).toFixed(2);
  return {
    vehicleType: type,
    fare,
    etaMin,
    dropTime,
    driversNearby: grouped[type].count,
    distance: tripDistance.distanceMiles, // Defaulting to miles for response
    distanceKm: tripDistance.distanceKm
  };
}

module.exports.getprices = async (req, res, next) => {
  try {
    const { plng, plat, dlng, dlat } = validateBody(req);
    console.log({ plng, plat, dlng, dlat })
    const vehicalData = await getVehicleRules();
    const tripDistance = await getTripDistance(plat, plng, dlat, dlng);
    const drivers = await getNearbyDriversWithMeta(plng, plat, 50, 100);
    console.log({ drivers })
    if (!drivers.length) return res.error(404, "No drivers nearby");
    const grouped = groupByVehicleType(drivers);
    const surgeMultiplier = 1.5;
    const tollFee = 0;
    const results = [];
    for (const v of vehicalData) {
      const opt = buildFareOption(v, grouped, tripDistance, surgeMultiplier, tollFee);
      if (opt) results.push(opt);
    }
    console.log("results-------------------", results)
    if (!results.length) return res.success("No drivers available for fare calculation", []);
    results.sort((a, b) => a.fare - b.fare);
    return res.success("Fare options fetched successfully", { results, xtracoin: Math.floor(tripDistance.distanceMiles) });
  } catch (error) {
    if (error.statusCode) return res.error(error.statusCode, error.message);
    next(error);
  }
};



function bookRideLog(step, data = {}) {
  console.log("[BookRide]", step, { at: new Date().toISOString(), ...data });
}

module.exports.BookRide = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);

    const user = await Queries.findOne(Model.User, { _id: auth._id });
    if (!user) return res.error(404, "User not found");

    let effectivePaymentMethodId = req.body.paymentMethodId;
    const { plng, plat, dlng, dlat, pickup, drop, vehicleType, paymentType, distance, totalfare } = req?.body;

    bookRideLog("start", {
      userId: auth._id?.toString(),
      vehicleType,
      paymentType,
      pickup: !!pickup,
      plat,
      plng,
    });

    // ---- Multi-Card: Handle ONLINE payment card selection ----
    if (paymentType?.toUpperCase() === 'ONLINE') {
      const stripeCustomerId = user.stripe_customer_id;
      if (effectivePaymentMethodId) {
        await validatePaymentMethodOwnership(effectivePaymentMethodId, stripeCustomerId);
      } else {
        effectivePaymentMethodId = await getOrCreateDefaultPaymentMethod(stripeCustomerId, user);
      }

      if (!effectivePaymentMethodId) {
        bookRideLog("blocked:payment_setup_required", { userId: auth._id?.toString() });
        const secretKey = await createCustomerAndSetupPayment(auth._id);
        return res.success("Please complete your payment Setup process to book a ride.", {
          SecretKey: secretKey,
          secretKey,
        });
      }
      bookRideLog("payment_ok", { paymentMethodId: effectivePaymentMethodId });
    }

    const userOrderKey = auth._id.toString();
    const rideData = await Redisquery.getActiveRideMetaOrClearStale(userOrderKey, 300);
    if (rideData) {
      bookRideLog("blocked:redis_active_ride", { userId: userOrderKey, vehicleType: rideData.vehicleType });
      return res.error(400, common.constants.RESPONSE_MESSAGES.BOOOKED_RIDE);
    }

    const ongoingRide = await Queries.findOne(Model.Order, {
      userId: auth._id,
      rideType: "Now",
      status: { $in: ["Pending", "Accepted", "Arrived", "InProgress"] }
    });

    if (ongoingRide) {
      const isStalePending =
        ongoingRide.status === "Pending" &&
        !ongoingRide.driverId &&
        ongoingRide.createdAt &&
        Date.now() - new Date(ongoingRide.createdAt).getTime() > 15 * 60 * 1000;

      if (!isStalePending) {
        bookRideLog("blocked:mongo_ongoing_ride", {
          orderId: ongoingRide._id?.toString(),
          status: ongoingRide.status,
        });
        return res.error(400, common.constants.RESPONSE_MESSAGES.BOOOKED_RIDE);
      }

      bookRideLog("cancelled_stale_pending_order", { orderId: ongoingRide._id?.toString() });
      ongoingRide.status = "Cancelled";
      ongoingRide.cancelby = "USER";
      await ongoingRide.save();
    }

    validateRideInput(plng, plat, dlng, dlat, pickup, drop, vehicleType, paymentType);
    const tripDistance = await getTripDistance(plat, plng, dlat, dlng);
    bookRideLog("distance_calculated", {
      distanceKm: tripDistance.distanceKm,
      distanceMiles: tripDistance.distanceMiles,
    });

    let plateformFee = await Redisquery.GetItem(`BOOKINGPRICE_${vehicleType}`);
    if (!plateformFee) {
      plateformFee = await Queries.findOne(Model.Admin, { type: "BOOKINGPRICE", VehicalType: vehicleType });
      if (plateformFee) {
        await Redisquery.SetItem(`BOOKINGPRICE_${vehicleType}`, plateformFee);
      }
    }
    if (!plateformFee) {
      bookRideLog("warn:no_booking_price_config", { vehicleType });
    }
    const base = Number(plateformFee?.baseprice || 0);
    const distPrice = Number(plateformFee?.distaceprice || 0) * tripDistance.distanceKm;
    const subtotal = base + distPrice;
    const platformFeeAmount = +((subtotal * Number(plateformFee?.plateformfees || 0)) / 100).toFixed(2);
    const driverGet = +(totalfare - platformFeeAmount).toFixed(2);

    const drivers = await Redisquery.GetallNearByDriver(parseFloat(plng), parseFloat(plat), vehicleType);

    if (!drivers.length) {
      bookRideLog("blocked:no_nearby_drivers", { vehicleType, plng, plat });
      return res.error(404, "No nearby drivers available");
    }
    bookRideLog("drivers_found", { count: drivers.length, driverIds: drivers.map((d) => d.driverId) });

    const OrderId = auth?._id.toString();
    const rideOTP = await functions.generateNumber(4);

    const orderData = {
      plng,
      plat,
      dlng,
      dlat,
      pickup,
      drop,
      vehicleType,
      paymentType,
      rideOTP,
      distance: tripDistance.distanceMiles,
      distanceKm: tripDistance.distanceKm,
      totalfare: driverGet,
      OrderId,
      userId: auth?._id,
      name: auth?.name,
      phone: auth?.phone,
      profile: auth?.profileImage || '',
      fcmToken: auth?.fcmToken,
      ...(effectivePaymentMethodId && { paymentMethodId: effectivePaymentMethodId })
    };

    await Redisquery.insertRide(OrderId, plng, plat, orderData, 300);

    await notifyDrivers(drivers, { plng, plat, dlng, dlat, pickup, drop, distance: tripDistance.distanceMiles, distanceKm: tripDistance.distanceKm, totalfare: driverGet, paymentType, OrderId, name: auth?.name, profile: auth?.profileImage, id: auth?._id, phone: auth?.phone });

    bookRideLog("success", { OrderId, driverGet, driversNotified: drivers.length });

    return res.success("Ride requested successfully", {
      OrderId,
      orderId: OrderId,
    });
  } catch (error) {
    bookRideLog("error", { message: error.message, code: error.code });
    next(error);
  }
};


module.exports.ScheduleBookRide = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);

    const {
      plng, plat, dlng, dlat,
      pickup, drop,
      vehicleType, paymentType,
      distance, totalfare,
      time, Date,
      paymentMethodId
    } = req.body;

    validateScheduleRideInput({
      plng, plat, dlng, dlat,
      pickup, drop,
      vehicleType, paymentType,
      distance, totalfare,
      time, date: Date
    });

    const conflictMsg = await checkScheduleConflict(auth._id);
    if (conflictMsg) return res.error(400, conflictMsg);

    const rideOTP = await functions.generateNumber(4);

    const orderData = {
      userId: auth._id,
      name: auth.name,
      phone: auth.phone,
      email: auth.email,

      pickupLocation: {
        address: pickup,
        coordinates: [plng, plat],
      },
      dropLocation: {
        address: drop,
        coordinates: [dlng, dlat],
      },

      vehicleType,
      rideType: "Schedule",
      bookingType: "Ride",

      travelDate: Date,
      travelTime: time,

      fareDetails: {
        totalFare: totalfare,
        distanceKm: distance,
        distanceMiles: distance * 0.621371, // Assuming frontend sends KM if distance is passed as single param
      },

      payment: {
        method: paymentType.toUpperCase(),
        amount: totalfare,
        isPaid: false,
      },
      paymentMethodId: paymentMethodId || null,

      rideotp: rideOTP,
      status: "Pending",
    };


    const scheduleRideData = await Queries.insertOne(Model.Order, orderData);
    await scheduleRide(scheduleRideData._id.toString(), auth._id, Date, time);
    await service.Email.sendScheduleRideEmail(auth.email, "Your Ride is Scheduled", {
      pickup,
      drop,
      otp: rideOTP,
      date: Date,
      time,
      vehicleType,
      totalFare: totalfare,
    })

    return res.success("Ride scheduled successfully", { OrderId: scheduleRideData._id });

  } catch (error) {
    console.error("❌ ScheduleBookRide Error:", error);
    next(error);
  }
};


module.exports.CancelScheduleRide = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    const { OrderId } = req?.body
    if (!OrderId) return res.error(400, "Ride Id is required")

    const scheduleRideData = await Queries.findOne(Model.Order, { _id: OrderId, userId: auth?._id });
    if (!scheduleRideData) return res.error(400, "Ride Not found")
    if (scheduleRideData.status === "Completed") {
      return res.error(400, "This ride has already been completed — further actions are not allowed.");
    }

    if (scheduleRideData.status === "Cancelled") {
      return res.error(400, "This ride has already been cancelled. Please schedule a new ride if needed.");
    }
    await stopCronJob(`ride_${scheduleRideData._id.toString()}`);
    await service.Email.sendCancelledScheduleRideEmail(auth.email, "Your Scheduled Ride Has Been Cancelled", {
      pickup: scheduleRideData.pickupLocation.address,
      drop: scheduleRideData.dropLocation.address,
      otp: scheduleRideData.rideotp,
      date: scheduleRideData.travelDate,
      time: scheduleRideData.travelTime,
      vehicleType: scheduleRideData.vehicleType,
      totalFare: scheduleRideData.fareDetails.totalFare,
    })
    scheduleRideData.status = "Cancelled"
    await scheduleRideData.save()
    return res.success(" scheduled Ride Cancel successfully", { OrderId: scheduleRideData._id });

  } catch (error) {
    console.error("❌ ScheduleBookRide Error:", error);
    next(error);
  }
};


async function checkScheduleConflict(userId) {
  const activeRide = await Model.Order.findOne({
    userId,
    rideType: "Schedule",
    status: { $nin: ["Completed", "Cancelled"] },
  });

  if (activeRide) {
    return "You already have an active scheduled ride. Please complete your previous scheduled ride first.";
  }

  return null;
}

function validateScheduleRideInput({
  plng, plat, dlng, dlat,
  pickup, drop,
  vehicleType, paymentType,
  distance, totalfare, time, date
}) {
  if (!plng || !plat) throw new Error("Pickup coordinates are required");
  if (!dlng || !dlat) throw new Error("Drop coordinates are required");
  if (!pickup) throw new Error("Pickup address is required");
  if (!drop) throw new Error("Drop address is required");
  if (!vehicleType) throw new Error("Vehicle type is required");
  if (!paymentType) throw new Error("Payment type is required");
  if (distance == null) throw new Error("Distance is required");
  if (totalfare == null) throw new Error("Total fare is required");
  if (!time) throw new Error("Travel time is required for scheduled rides");
  if (!date) throw new Error("Travel date is required for scheduled rides");

  const rideMoment = moment(`${date} ${time}`, "YYYY-MM-DD HH:mm");
  if (!rideMoment.isValid()) {
    throw new Error("Invalid date or time format (expected YYYY-MM-DD HH:mm)");
  }
  if (rideMoment.isBefore(moment())) {
    throw new Error("Travel date and time cannot be in the past");
  }
}




const validateRideInput = (plng, plat, dlng, dlat, pickup, drop, vehicalType, PaymentType) => {
  if (!plng || !plat || !dlng || !dlat || !pickup || !drop || !vehicalType || !PaymentType) {
    throw new Error("PickUp, Drop coordinates, vehicle type, and payment type are required");
  }
};



const notifyDrivers = async (drivers, OrderId) => {

  console.log("notify driver")
  for (let driver of drivers) {
    // try {
    //   await sendNotification(
    //     driver?.fcmToken,
    //     "🚗 New Ride Request",
    //     "You have a new ride request. Check details and accept now."
    //   );
    // } catch (error) {
    //   console.error("Failed to push notification to driver:", driver?.driverId);
    // }

    try {
      await PubNub.publishMessage(driver.driverId, OrderId);
    } catch (error) {
      console.error("Failed to send PubNub message to driver:", driver?.driverId);
    }
  }
};


module.exports.Demo = async (req, res, next) => {
  try {
    await PubNub.publishMessage("1234567890", "Hello User")
    return res.success("Ride requested successfully");
  } catch (error) {
    next(error);
  }
};



module.exports.RideHistory = async (req, res, next) => {
  try {
    const auth = req.user;

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);

    let filter = {}; // Change key if different in your schema
    const projection = "";
    filter.userId = auth?._id.toString()
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success("No ride history found", { data: [], page, limit });
    }

    return res.success("Ride history fetched successfully", orderData);
  } catch (error) {
    console.error("RideHistory Error:", error);
    next(error);
  }
};




module.exports.ChangePaymentMethod = async (req, res, next) => {
  try {
    const auth = req?.user;
    const { PaymentType } = req?.body
    if (!PaymentType) return res.error(400, "PaymentType required")
    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }
    const UserData = await Queries.findOne(Model.User, { _id: auth?._id })
    if (!UserData) return res.error(400, "User Not found")
    UserData.paymentmode = PaymentType
    await UserData.save()
    return res.success("Ride history fetched successfully", { PaymentType });
  } catch (error) {
    console.error("RideHistory Error:", error);
    next(error);
  }
};


module.exports.BookBus = async (req, res, next) => {
  try {
    const auth = req.user;

    const {
      name,
      code,
      phone,
      email,
      dateoftrevel,
      deptime,
      deplocation,
      deslocation,
    } = req.body;

    // Validate required fields
    if (
      !name || !phone || !code || !email || !dateoftrevel || !deptime ||
      !deplocation || !deslocation
    ) {
      return res.error(400, "All fields are required.");
    }

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const user = await Queries.findOne(Model.User, { _id: auth._id });
    if (!user) return res.error(404, "User not found");
    const existingBooking = await Queries.findOne(Model.Order, {
      userId: auth._id,
      email,
      bookingType: "Bus",
      "pickupLocation.address": deplocation,
      "dropLocation.address": deslocation,
      travelDate: new Date(dateoftrevel),
      travelTime: deptime
    });

    if (existingBooking) {
      return res.error(409, "You have already booked a bus with the same details.");
    } const orderdata = {
      userId: auth._id,
      name,
      email,
      phone: `${formateCode(code)}${phone}`,
      pickupLocation: {
        address: deplocation,
        coordinates: [parseFloat(0.0), parseFloat(0.0)],
      },
      dropLocation: {
        address: deslocation,
        coordinates: [parseFloat(0.0), parseFloat(0.0)],
      },
      travelDate: new Date(dateoftrevel),
      travelTime: deptime,
      rideType: "Schedule",
      bookingType: "Bus",
      status: "Pending",
      vehicleType: "BUS"
    };

    const insertData = await Queries.insertOne(Model.Order, orderdata);
    await service.Email.sendBusBookingEmail(auth?.email, "Your Bus  is Booked successfully", {
      name,
      dateoftrevel,
      deptime,
      deplocation,
      deslocation,
      phone,
      email
    })

    return res.success("Bus booked successfully", { orderdata });

  } catch (error) {
    console.error("BookBus Error:", error);
    next(error);
  }
};

module.exports.scheduleRideHistory = async (req, res, next) => {
  try {
    const auth = req.user;

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);

    let filter = {}; // Change key if different in your schema
    const projection = "";
    filter.userId = auth?._id.toString()
    filter.rideType = "Schedule"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success("No Schedule ride history found", { data: [], page, limit });
    }

    return res.success("Schedule Ride history fetched successfully", orderData);
  } catch (error) {
    console.error(" schedule Ride History Error:", error);
    next(error);
  }
};



module.exports.CancelRide = async (req, res, next) => {
  try {
    const auth = req.user;
    const { orderId, cancelId } = req?.body
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const OrderId = auth?._id.toString()
    const rideData = await Redisquery.GetItemToSaveWithLocation(`ride_meta:${OrderId}`)
    if (rideData) {
      await Redisquery.deleteRide(OrderId)
      const drivers = await Redisquery.GetallNearByDriver(parseFloat(rideData?.plng), parseFloat(rideData?.plat), rideData?.vehicleType);
      await notifyDrivers(drivers, { OrderId, status: "CANCEL" })
      return res.success(common.constants.RESPONSE_MESSAGES.CANCELRIDE, { OrderId });

    }
    if (!orderId) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED)
    const userData = await Queries.findOne(Model.User, { _id: auth?._id })
    if (!userData) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)

    const OrderData = await Queries.findOne(Model.Order, { _id: orderId })
    if (!OrderData) return res.error(400, "Order Not found")
    if (OrderData.status === "Cancelled") return res.error(400, "Order Already cancelled")
    if (OrderData.status === "Completed") return res.error(400, "This order has already been completed and cannot be cancelled.");
    let vehicle = await Redisquery.GetItem(`BOOKINGPRICE_${OrderData?.vehicleType}`);
    if (!vehicle) {
      vehicle = await Queries.findOne(Model.Admin, { type: "BOOKINGPRICE", VehicalType: OrderData?.vehicleType });
      if (!vehicle) return res.error(400, "Vehicle pricing not found");
      await Redisquery.SetItem(`BOOKINGPRICE_${OrderData?.vehicleType}`, vehicle);
    }
    let cancelFare = 0
    if (OrderData.status === "Accepted") {
      const rideTime = await functions.calculateTime(OrderData?.updatedAt);
      const validRideTime = isNaN(parseInt(rideTime)) ? 0 : parseInt(rideTime);
      const cancelRate = parseInt(vehicle?.cancelprice) || 0;
      cancelFare = validRideTime * cancelRate;
      const cancelcharges = (userData.duePay || 0) + cancelFare;
      userData.duePay = cancelcharges;
      await userData.save();
      OrderData.status = "Cancelled";
      OrderData.fareDetails.cancelFare = cancelFare;
      OrderData.cancelreasonId = cancelId;
      OrderData.cancelby = "USER"
      await OrderData.save();
    }
    OrderData.status = "Cancelled"
    await OrderData.save()
    console.log("New vehicle ........................................")
    const driverData = await Queries.findOne(Model.Driver, { _id: OrderData?.driverId })
    await sendNotification(
      driverData?.fcmToken,
      "🚗 Ride Cancelled",
      "Your rider has cancelled the trip. Please standby for your next booking."
    );
    await PubNub.publishMessage(OrderData?.driverId, { OrderId, status: "AcceptCancel" });
    return res.success("Cancel Ride  successfully", { cancelFare });
  } catch (error) {
    console.error("cancel ride Error:", error);
    next(error);
  }
};

const { getCancelReasonsByType } = require("../../common/cancelReasons");

module.exports.GetUserCancelReason = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const cancelData = await getCancelReasonsByType("USERCANCEL");
    if (!cancelData) {
      return res.error(
        400,
        "Cancel reasons are not configured. Add documents in admin collection with type USERCANCEL."
      );
    }

    return res.success("Cancel Reason Get successfully.", cancelData);
  } catch (err) {
    console.error("GetUserCancelReason Error:", err);
    next(err);
  }
};



module.exports.OrderStatus = async (req, res, next) => {
  try {
    const auth = req?.user;
    const OrderId = auth?._id.toString();

    const rideData = await Redisquery.GetItemToSaveWithLocation(`ride_meta:${OrderId}`);
    if (rideData) {
      return res.success("Order Status Get Successfully", {
        rideData,
        status: "Requesting",
      });
    }

    const { orderId } = req?.body;

    const userData = await Queries.findOne(Model.User, { _id: auth?._id });
    if (!userData)
      return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND);

    let OrderData;

    if (orderId) {
      OrderData = await Queries.findOne(Model.Order, { _id: orderId }, null, [
        { path: "driverId", select: "phone name driverPhoto VehicalType VehicalDetails.plateNumber" },
      ]);
    }

    if (!OrderData) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      OrderData = await Model.Order.findOne({
        userId: auth?._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ createdAt: -1 })
        .populate("driverId", "phone name driverPhoto VehicalType VehicalDetails.plateNumber")
        .lean();
    }

    if (!OrderData) {
      return res.sucess("Ride Not found for today", {
        rideData: {},
        status: "Empty",
      });
    }

    return res.success("Order Status Get Successfully", {
      rideData: OrderData,
      status: OrderData?.status,
    });
  } catch (error) {
    next(error);
  }
};


module.exports.addDriverReview = async (req, res, next) => {
  try {
    const auth = req.user;
    const {
      orderId,
      comment,
      driverBehavior,
      drivingSkill,
      security,
      hygiene
    } = req.body;
    if (!orderId) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const review = {
      comment,
      driverBehavior,
      drivingSkill,
      security,
      hygiene,
    };

    const updated = await Model.Order.findOneAndUpdate(
      { _id: orderId, userId: auth._id },
      { $set: { driverreview: review } },
      { new: true }
    );

    if (!updated) return res.error(404, "Order not found or access denied");
    const allRatings = [driverBehavior, drivingSkill, security, hygiene];
    const isRefund = allRatings.every((r) => Number(r) === 1);

    return res.success("Driver review added successfully", {
      orderId,
      isRefund
    });
  } catch (error) {
    next(error);
  }
};


module.exports.RequestRefund = async (req, res, next) => {
  try {
    const auth = req?.user;
    const { orderId } = req.body;

    if (!orderId) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID);
    }

    const OrderData = await Queries.find(Model.Order, {
      _id: orderId,
      userId: auth?._id,
    });

    if (!OrderData) {
      return res.error(400, "Ride not found for given Id");
    }

    if (["Pending", "Accepted", "Arrived", "InProgress"].includes(OrderData.status)) {
      return res.error(400, "Refund not allowed. This ride has not been completed yet.");
    }

    if (OrderData.status === "Cancelled") {
      return res.error(400, "Refund not allowed. This ride has been cancelled.");
    }

    if (OrderData.status !== "Completed") {
      return res.error(400, "Refund not allowed for this ride status.");
    }
    if (OrderData.payment.method === "CASH") {
      return res.success("Refund not applicable on Cash Mode", { isrefundable: false });

    }
    const review = OrderData.userreview;
    if (review) {
      const { customerBehavior, waitingTime, hygiene, generosity } = review;
      const ratings = [customerBehavior, waitingTime, hygiene, generosity].filter(
        (v) => typeof v === "number"
      );

      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        if (avg === 1) {
          const refund = {
            rideId: orderId,
            userId: auth?._id,
          };

          const RefundData = await Queries.insertOne(Model.refund, refund);

          return res.success(
            "Refund request submitted successfully. Please wait for  approval.",
            { orderId, refundId: RefundData?._id, isrefundable: true }
          );
        } else {
          return res.success("Refund not applicable.", { isrefundable: false });
        }
      }
    }

    return res.success("Refund not applicable. No valid review found.", { isrefundable: false });
  } catch (error) {
    next(error);
  }
};







module.exports.Payment = async (req, res, next) => {
  try {
    const auth = req?.user;
    const { orderId } = req.query;
    if (!orderId) return res.error(400, "orderId is required")
    const OrderData = await Queries.findOne(Model.Order, { _id: orderId, userId: auth?._id })
    if (!OrderData) return res.error(400, "Order Not found")
    const amount = OrderData?.fareDetails?.totalFare * 100
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return res.success("Payment Initialised successfully", { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports.CheckPaymentStatus = async (req, res, next) => {
  try {
    const auth = req?.user;

    const { paymentIntentId, orderId } = req?.body;
    if (!paymentIntentId || !orderId) return res.error(400, "paymentIntentId and orderId required");

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["charges.data.payment_method_details"],
    });
    console.log({ paymentIntent })
    const OrderData = await Queries.findOne(Model.Order, { _id: orderId, userId: auth?._id },
      null,
      [
        { path: "driverId", select: "fcmToken name" },
      ]
    )
    if (paymentIntent.status === "succeeded") {
      OrderData.payment.method = "ONLINE"
      OrderData.payment.isPaid = true
      await sendNotification(
        OrderData?.driverId?.fcmToken,
        "💰 Payment Received",
        `Hi ${OrderData?.driverId?.name}, you’ve successfully received $${OrderData?.fareDetails?.driverGets} for your recent ride with ${auth?.name}. Your earnings have been updated in your account.`
      );
      await sendNotification(
        auth?.fcmToken,
        "✅ Payment Successful",
        `Hi ${auth?.name}, your payment of $${OrderData?.fareDetails?.totalFare} for your ride with ${OrderData?.driverId?.name} has been received successfully. Thank you for riding with us!`
      );

      OrderData.payment.paymentDetails = paymentIntent
      await OrderData.save()
    }

    return res.success("Payment status fetched", { paymentStatus: paymentIntent.status });
  } catch (error) {
    console.error("❌ Error checking payment:", error);
    next(error);
  }
};

module.exports.Lifecycle = async (req, res, next) => {
  try {
    const auth = req?.user;

    // Check for active ride in Redis (requesting/pending)
    const rideData = await Redisquery.getActiveRideMetaOrClearStale(auth._id.toString(), 300);
    if (rideData) {
      return res.success("Current Activity: Searching for Driver", {
        activity: "Searching for Driver",
        rideData,
        status: "SEARCHING",
      });
    }

    // Check for ongoing rides in database
    const ongoingRide = await Queries.findOne(Model.Order, {
      userId: auth._id,
      rideType: "Now",
      status: { $in: ["Pending", "Accepted", "Arrived", "InProgress"] }
    },
      null,
      [
        { path: "driverId", select: "name VehicalDetails phone" },
      ]
    );
    let driverRides = null;
    console.log("Ongoing Ride Found:", ongoingRide);
    if (ongoingRide) {
      driverRides = await Queries.GetDriverReviewStats(Model.Order, ongoingRide?.driverId);

      // Check if ride is more than 24 hours old and accepted, then cancel
      if (ongoingRide.createdAt && (Date.now() - new Date(ongoingRide.createdAt).getTime()) > 24 * 60 * 60 * 1000 && ongoingRide.status === "Accepted") {
        await Model.Order.updateOne(
          { _id: ongoingRide._id },
          { $set: { status: "Cancelled", cancelby: "USER" } }
        );
        ongoingRide.status = "Cancelled";
        return res.success("Ride cancelled due to timeout", {
          activity: "Ride Cancelled",
          rideData: ongoingRide,
          status: "CANCELLED",
          completedRide: driverRides?.totalCompletedRides,
          review: driverRides?.totalAvgRating,
        });
      }
      let status;
      switch (ongoingRide.status) {
        case "Pending":
          status = "CREATED";
          break;
        case "Accepted":
          status = "ACCEPTED";
          break;
        case "Arrived":
          status = "ARRIVED";
          break;
        case "InProgress":
          status = "IN_PROGRESS";
          break;
        default:
          status = "CREATED";
      }
      return res.success("Current Activity: Ride In Progress", {
        activity: "Ride In Progress",
        rideData: ongoingRide,
        status,
        completedRide: driverRides?.totalCompletedRides,
        review: driverRides?.totalAvgRating,
      });
    }

    // Check for scheduled rides
    const scheduledRide = await Queries.findOne(Model.Order, {
      userId: auth._id,
      rideType: "Schedule",
      status: { $nin: ["Completed", "Cancelled", "CANCELLED"] }
    });

    if (scheduledRide) {
      return res.success("Current Activity: Scheduled Ride Pending", {
        activity: "Scheduled Ride Pending",
        rideData: scheduledRide,
        status: "CREATED",

      });
    }

    // No active activity
    return res.success("Current Activity: No Active Rides", {
      activity: "No Active Rides",
      rideData: {},
      status: "IDLE",
    });

  } catch (error) {
    console.error("Lifecycle Error:", error);
    next(error);
  }
};

function isMissingStripeCustomerError(err) {
  if (!err) return false;
  const msg = err.message || err.raw?.message || "";
  return (
    err.code === "resource_missing" ||
    err.param === "customer" ||
    /no such customer/i.test(msg)
  );
}

async function createSetupIntentForCustomer(customerId) {
  return stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    usage: "off_session",
  });
}

async function ensureStripeCustomerId(user) {
  const userId = user._id?.toString();

  const createStripeCustomer = async () => {
    const payload = {
      name: user.name || "Customer",
      metadata: { userId },
    };
    if (user.email) payload.email = user.email;

    const customer = await stripe.customers.create(payload);
    user.stripe_customer_id = customer.id;
    await user.save();
    return customer.id;
  };

  if (!user.stripe_customer_id) {
    return createStripeCustomer();
  }

  try {
    const customer = await stripe.customers.retrieve(user.stripe_customer_id);
    if (customer.deleted) {
      return createStripeCustomer();
    }
    return user.stripe_customer_id;
  } catch (err) {
    if (isMissingStripeCustomerError(err)) {
      return createStripeCustomer();
    }
    throw err;
  }
}

async function createCustomerAndSetupPayment(id) {
  try {
    const user = await Queries.findOne(Model.User, { _id: id });
    if (!user) throw new Error("Unauthorized user");

    const customerId = await ensureStripeCustomerId(user);
    const setupIntent = await createSetupIntentForCustomer(customerId);
    return setupIntent.client_secret;
  } catch (error) {
    console.error("Customer setup error:", error.message);
    throw new Error("Customer setup failed");
  }
}

// module.exports.CheckOnboardingStatus = async (req, res) => {
//   try {
//     const auth = req.user;

//     if (!auth) {
//       return res.error(400, "User not found");
//     }
//     const user = await Queries.findOne(Model.User, { _id: auth._id });
//     if (!user) {
//       return res.error(400, "User not found");
//     }
//     let paymentSetupCompleted = false;

//     if (user.stripe_customer_id) {
//       const customer = await stripe.customers.retrieve(
//         user.stripe_customer_id
//       );
// console.log("stripe key", customer)

//       let paymentMethodId =
//         customer.invoice_settings?.default_payment_method;

//       // 👉 If no default, check list
//       if (!paymentMethodId) {
//         const paymentMethods = await stripe.paymentMethods.list({
//           customer: user.stripe_customer_id,
//           type: "card",
//         });
//         console.log("Payment methods found:", paymentMethods.data);
//         if (paymentMethods.data.length > 0) {
//           paymentMethodId = paymentMethods.data[0].id;
//         }
//       }

//       paymentSetupCompleted = !!paymentMethodId;
//     }

//     if (paymentSetupCompleted && user.stripe_account_id) {
//         await stripe.accounts.update(user.stripe_account_id, {
//           settings: {
//             payouts: {
//               schedule: {
//                 interval: "daily", // enable autopay
//               },
//             },
//           },
//         });
//       }
//         // ✅ Update DB (important)
//         user.payment_setup_completed = paymentSetupCompleted;
//         await user.save();
//         await sendNotification(
//           auth?.fcmToken,
//           "✅ Payment Setup Completed",
//           `Hi ${auth?.name}, your payment setup has been completed successfully. Thank you for riding with us!`
//         );
//         // ✅ Final response
//         return res.success("Payment status checked", {
//           payment_setup_completed: paymentSetupCompleted,
//         });

//       } catch (error) {
//         console.error("Payment setup check error:", error.message);
//         return res.error(500, error.message);
//       }
// };


module.exports.CheckOnboardingStatus = async (req, res) => {

  try {

    const auth = req.user;

    if (!auth) {

      return res.error(400, "User not found");

    }

    const user = await Queries.findOne(Model.User, { _id: auth._id });

    if (!user) {

      return res.error(400, "User not found");

    }

    let paymentSetupCompleted = false;

    if (user.stripe_customer_id) {
      try {
        const customerId = await ensureStripeCustomerId(user);
        const customer = await stripe.customers.retrieve(customerId);
        let paymentMethodId = customer.invoice_settings?.default_payment_method;

        if (!paymentMethodId) {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });

          if (paymentMethods.data.length > 0) {
            paymentMethodId = paymentMethods.data[0].id;
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          }
        }

        paymentSetupCompleted = !!paymentMethodId;
      } catch (stripeError) {
        if (!isMissingStripeCustomerError(stripeError)) throw stripeError;
      }
    }

    // ❌ REMOVE THIS BLOCK (wrong coupling)

    /*

    if (paymentSetupCompleted && user.stripe_account_id) {

      await stripe.accounts.update(user.stripe_account_id, {

        settings: {

          payouts: {

            schedule: {

              interval: "daily",

            },

          },

        },

      });

    }

    */

    // ✅ Save status

    user.payment_setup_completed = paymentSetupCompleted;

    await user.save();

    // 🔔 Only notify if completed

    if (paymentSetupCompleted) {

      await sendNotification(

        auth?.fcmToken,

        "✅ Payment Setup Completed",

        `Hi ${auth?.name}, your payment setup has been completed successfully.`

      );

    }

    return res.success("Payment status checked", {

      payment_setup_completed: paymentSetupCompleted,

    });

  } catch (error) {

    console.error("Payment setup check error:", error.message);

    return res.error(500, error.message);

  }

};

async function isAutopayEnabled(stripe_customer_id) {
  try {
    if (!stripe_customer_id) {
      throw new Error("Missing stripe_customer_id");
    }

    console.log("Checking autopay for customer:", stripe_customer_id);

    const customer = await stripe.customers.retrieve(
      stripe_customer_id
    );

    let paymentMethod =
      customer.invoice_settings?.default_payment_method;

    // 👉 fallback: check attached cards
    if (!paymentMethod) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripe_customer_id,
        // type: "card",
      });

      if (paymentMethods.data.length > 0) {
        paymentMethod = paymentMethods.data[0].id;
        await stripe.customers.update(stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethod,
          },
        });
      }
    }

    const isAutopay = !!paymentMethod;

    console.log("Autopay status:", isAutopay);

    return isAutopay;

  } catch (error) {
    console.error("Autopay check error:", error.message);
    return false;
  }
}


module.exports.EnableAutopay = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.error(400, "User not found");
    }

    if (!user.stripe_customer_id) {
      return res.error(
        400,
        "Stripe customer ID not found. Please set up payment method first."
      );
    }

    // 1️⃣ Get customer
    const customer = await stripe.customers.retrieve(
      user.stripe_customer_id
    );

    let paymentMethod =
      customer.invoice_settings?.default_payment_method;

    // 2️⃣ Fallback: fetch ALL payment methods (no type filter)
    if (!paymentMethod) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripe_customer_id,
        // 🔥 no type here
      });

      if (paymentMethods.data.length > 0) {
        paymentMethod = paymentMethods.data[0].id;
      }
    }

    // 3️⃣ Determine autopay
    const isAutopayEnabled = !!paymentMethod;

    // 4️⃣ Save in DB
    user.autopay_enabled = isAutopayEnabled;
    await user.save();

    return res.success("Autopay status updated", {
      autopayEnabled: isAutopayEnabled,
    });

  } catch (error) {
    console.error("Enable autopay error:", error.message);
    return res.error(500, error.message);
  }
};


module.exports.DisableAutopay = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.error(400, "User not found");
    }

    if (!user.stripe_customer_id) {
      return res.error(
        400,
        "Stripe customer ID not found."
      );
    }

    // 1️⃣ Get customer
    const customer = await stripe.customers.retrieve(
      user.stripe_customer_id
    );

    const defaultPaymentMethod =
      customer.invoice_settings?.default_payment_method;
    console.log("Customer retrieved:", customer);
    console.log("Current default payment method:", defaultPaymentMethod);
    // 2️⃣ Remove default payment method
    if (defaultPaymentMethod) {
      console.log("Removing default payment method:", defaultPaymentMethod);
      const autopayDisabled = await stripe.customers.update(user.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: null,
        },
      });
      console.log("Autopay disabled response:", autopayDisabled);
    }

    return res.success("Autopay disabled successfully", {
      autopayEnabled: false,
    });

  } catch (error) {
    console.error("Disable autopay error:", error.message);
    return res.error(500, error.message);
  }
};


// ======================== Multi-Card Support ========================

/**
 * GET /setup-intent
 * Returns a Stripe SetupIntent client_secret for adding a new card.
 * Creates a Stripe customer if one does not exist yet.
 */
module.exports.GetSetupIntent = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const user = await Queries.findOne(Model.User, { _id: auth._id });
    if (!user) return res.error(404, "User not found");

    const customerId = await ensureStripeCustomerId(user);
    const setupIntent = await createSetupIntentForCustomer(customerId);
    const clientSecret = setupIntent.client_secret;

    return res.success("SetupIntent created successfully", {
      clientSecret,
      SecretKey: clientSecret,
      customerId,
    });
  } catch (error) {
    console.error("GetSetupIntent Error:", error.message);
    return res.error(error.statusCode || 500, error.message || "Failed to create setup intent");
  }
};

/**
 * GET /saved-cards
 * Returns all saved card payment methods for the authenticated user.
 */
module.exports.GetSavedCards = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const user = await Queries.findOne(Model.User, { _id: auth._id });
    if (!user) return res.error(404, "User not found");

    if (!user.stripe_customer_id) {
      return res.success("No cards found", { cards: [] });
    }

    let customerId;
    try {
      customerId = await ensureStripeCustomerId(user);
    } catch (stripeError) {
      if (isMissingStripeCustomerError(stripeError)) {
        return res.success("No cards found", { cards: [] });
      }
      throw stripeError;
    }

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const cards = paymentMethods.data.map((pm) => ({
      paymentMethodId: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return res.success("Saved cards fetched successfully", { cards });
  } catch (error) {
    console.error("GetSavedCards Error:", error.message);
    next(error);
  }
};


async function validatePaymentMethodOwnership(paymentMethodId, stripeCustomerId) {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (!pm || pm.customer !== stripeCustomerId) {
    const err = new Error("This payment method does not belong to your account");
    err.statusCode = 400;
    throw err;
  }
  return pm;
}


async function getOrCreateDefaultPaymentMethod(stripeCustomerId, user = null) {
  if (!stripeCustomerId && !user) return null;

  let customerId = stripeCustomerId;
  if (user) {
    try {
      customerId = await ensureStripeCustomerId(user);
    } catch (err) {
      if (isMissingStripeCustomerError(err)) return null;
      throw err;
    }
  }

  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    let paymentMethodId = customer.invoice_settings?.default_payment_method;

    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      if (paymentMethods.data.length > 0) {
        paymentMethodId = paymentMethods.data[0].id;
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }
    }

    return paymentMethodId;
  } catch (err) {
    if (isMissingStripeCustomerError(err)) return null;
    throw err;
  }
}
