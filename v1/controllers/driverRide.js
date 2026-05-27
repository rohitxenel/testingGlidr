const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const { sendEmail } = require('../../services/email')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const Redisquery = require("../../queries/redis/query")
const { order } = require('./bookride')
const PubNub = require("../../common/pubnub");
const moment = require("moment");
const common = require("../../common");
const Stripe = require('stripe')

const { sendNotification } = require('../../connections/firebase')
const StripeKey = process.env.STRIPE_SECRET_KEY

const stripe = new Stripe(StripeKey);
// when fronted developer make pubnub then change this function
module.exports.UpdateLocation = async (req, res, next) => {
  try {

    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    if (!auth?.isadminVerified) return res.error(400, common.constants.RESPONSE_MESSAGES.ADMIN_UNVERIFYED)
    const { lng, lat, status } = req.body || {};
    if (!lng || !lat || !status) return res.error(400, common.constants.RESPONSE_MESSAGES.LAT_LNG);
    await Redisquery.updateLocation(auth?._id.toString(), lng, lat, auth?.VehicalType, status, auth?.fcmToken);
    return res.success(common.constants.RESPONSE_MESSAGES.UPDATE_LOC, { status: status });

  } catch (error) {
    next(error);
  }
};


module.exports.RideCompletedHistory = async (req, res, next) => {
  try {
    const auth = req.driver;

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    let filter = {}; // Change key if different in your schema
    const projection = "";
    filter.driverId = auth?._id.toString()
    filter.status = "Completed"
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

module.exports.RideCanceldHistory = async (req, res, next) => {
  try {
    const auth = req.driver;

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    let filter = {}; // Change key if different in your schema
    const projection = "";
    filter.driverId = auth?._id.toString()
    filter.status = "Cancelled"
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

module.exports.scheduleRideHistory = async (req, res, next) => {
  try {
    const auth = req.driver;

    if (!auth || !auth._id) {
      return res.error(401, "Unauthorized access. Please log in again.");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);

    let filter = {}; // Change key if different in your schema
    const projection = "";
    filter.driverId = auth?._id.toString()
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

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

module.exports.UpdateStatus = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { status, lat, lng } = req.body || {};
    if (!status || !lat || !lng)
      return res.error(400, "All fields required");

    await Model.Driver.findByIdAndUpdate(auth._id, { $set: { status } });

    // Always use UTC for consistency
    const todayUTC = moment.utc().format("YYYY-MM-DD");
    const now = new Date();

    let session = await Model.Sessions.findOne({
      driverId: auth._id,
      date: todayUTC,
    });

    // ONLINE / ONRIDE
    if (status === "ONLINE" || status === "ONRIDE") {
      await Redisquery.updateLocation(
        auth._id.toString(),
        lng,
        lat,
        auth?.VehicalType,
        status
      );

      if (!session) {
        session = await Model.Sessions.create({
          driverId: auth._id,
          date: todayUTC,
          sessions: [{ loginTime: now }],
          totalOnlineTime: 0,
        });
      } else {
        const lastSession = session.sessions.at(-1);
        if (!lastSession || lastSession.logoutTime) {
          session.sessions.push({ loginTime: now });
          await session.save();
        }
      }
    }

    // OFFLINE
    if (status === "OFFLINE" && session) {
      await Redisquery.updateLocation(
        auth._id.toString(),
        lng,
        lat,
        auth?.VehicalType,
        status
      );

      const lastSession = session.sessions.at(-1);
      if (lastSession && !lastSession.logoutTime) {
        lastSession.logoutTime = now;

        const duration = Math.floor((now - new Date(lastSession.loginTime)) / 1000); // seconds
        session.totalOnlineTime = (session.totalOnlineTime || 0) + duration;

        await session.save();
      }
    }

    // Fetch updated session
    const updated = await Model.Sessions.findOne({
      driverId: auth._id,
      date: todayUTC,
    });

    const totalTime = updated?.totalOnlineTime || 0;
    return res.success("Status updated successfully", {
      status,
      totalOnlineTime: totalTime,
      formattedTime: formatDuration(totalTime),
    });
  } catch (error) {
    console.error("UpdateStatus Error:", error);
    next(error);
  }
};



async function getTripDistanceTime(plat, plng, dlat, dlng) {
  console.log("user pickup--------", { plat, plng }, "driver current==", { dlat, dlng })
  const resp = await functions.getDistanceAndTime(plat, plng, dlat, dlng);
  const el = resp?.rows?.[0]?.elements?.[0];

  console.log("time checking value", el)
  if (!el || el.status !== "OK") {
    const e = new Error("Unable to calculate distance");
    e.statusCode = 400;
    throw e;
  }
  const distanceKm = el?.distance?.value / 1000;
  const distanceMiles = el?.distance?.value / 1609.34;
  return { distance: distanceMiles, distanceKm, time: el?.duration?.text };
}

const notifyDrivers = async (drivers, OrderId, Id) => {
  for (let driver of drivers) {
    if (String(driver.driverId) === String(Id)) {
      continue;
    }
    try {
      await PubNub.publishMessage(driver.driverId, OrderId);
    } catch (error) {
      console.error("Failed to send PubNub message to driver:", driver?.driverId);
    }
  }
};


module.exports.AcceptRide = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");
    if (!auth?.isadminVerified)
      return res.error(400, "Your profile is not verified by admin");

    const { OrderId, lng, lat } = req.body || {};
    if (!OrderId || !lng || !lat)
      return res.error(400, "All fields required");


    // ----------------------------------------
    // 🔐 1) Acquire Redis Lock (Atomic)
    // ----------------------------------------
    const gotLock = await Redisquery.acquireRideLock(OrderId, auth._id);

    if (!gotLock) {
      return res.error(400, "Ride already accepted by another driver");
    }


    // ----------------------------------------
    // 🧭 2) Get Ride Meta From Redis
    // ----------------------------------------
    const rideData = await Redisquery.GetItemToSaveWithLocation(`ride_meta:${OrderId}`);

    if (!rideData) {
      await Redisquery.releaseRideLock(OrderId, auth._id);
      return res.error(400, "Ride already accepted");
    }

    console.log("ACCEPT RIDE (after lock) ===", { rideData });


    rideData.driverId = auth._id;

    // ----------------------------------------
    // 📦 3) Accept Ride (Now or Schedule)
    // ----------------------------------------
    let orderData = null;

    if (rideData?.rideType !== "Schedule") {
      orderData = await order(rideData);
    }

    const TimeData = await getTripDistanceTime(
      rideData?.plat,
      rideData?.plng,
      lat,
      lng
    );

    const driverRides = await Queries.GetDriverReviewStats(Model.Order, auth._id);

    let scheduleRideData = {};

    // ----------------------------------------
    // 📩 Notify user driver accepted
    // ----------------------------------------
    await PubNub.publishMessage(rideData?.userId, {
      drivername: auth?.name,
      id: auth?._id,
      phone: `+${auth?.phone}`,
      completedRide: driverRides.totalCompletedRides,
      review: driverRides.totalAvgRating,
      profile: auth?.driverPhoto,
      numberplate: auth?.VehicalDetails?.plateNumber,
      vehicle: `${auth?.VehicalDetails?.brand} ${auth?.VehicalDetails?.model}`,
      OTP: rideData?.rideOTP,
      orderId:
        rideData?.rideType === "Schedule"
          ? rideData?.orderId
          : orderData?.orderId,
      distance: TimeData.distance,
      distanceKm: TimeData.distanceKm,
      time: TimeData.time,
    });


    // ----------------------------------------
    // 📌 4) Schedule Ride Special Logic
    // ----------------------------------------
    if (rideData?.rideType !== "Schedule") {
      await sendNotification(
        rideData?.fcmToken,
        "🎉 Ride Accepted!",
        "Your driver is on the way. Get ready for a smooth and comfortable journey."
      );
    } else {
      await sendNotification(
        rideData?.fcmToken,
        "Scheduled Ride Accepted!",
        `${rideData?.rideOTP} Your scheduled ride has been confirmed.`
      );

      // Calculate distance/time manually
      const distRes = await functions.getDistanceAndTime(
        parseFloat(rideData.plat),
        parseFloat(rideData.plng),
        parseFloat(rideData.dlat),
        parseFloat(rideData.dlng)
      );

      const result = distRes?.rows?.[0]?.elements?.[0];
      const distanceKm = result.distance.value / 1000;
      const distanceMiles = result.distance.value / 1609.34;
      const timeMin = result.duration.value / 60;

      const NewOrder = await Queries.findOne(Model.Order, {
        _id: rideData?.orderId,
      });

      let vehicle = await Redisquery.GetItem(`BOOKINGPRICE_${NewOrder?.vehicleType || 'Cab'}`);
      if (!vehicle) {
        vehicle = await Queries.findOne(Model.Admin, { type: "BOOKINGPRICE", VehicalType: NewOrder?.vehicleType || 'Cab' });
        if (vehicle) await Redisquery.SetItem(`BOOKINGPRICE_${NewOrder?.vehicleType || 'Cab'}`, vehicle);
      }

      const totalFare = parseFloat(rideData?.totalfare || 0);
      const base = Number(vehicle?.baseprice || 0);
      const distPrice = Number(vehicle?.distaceprice || 0) * distanceKm;
      const subtotal = base + distPrice;
      const platformFeePercentage = Number(vehicle?.plateformfees || 0);
      const platformFee = +((platformFeePercentage / 100) * subtotal).toFixed(2);
      const driverGet = +(totalFare - platformFee).toFixed(2);

      scheduleRideData.orderId = rideData?.orderId;
      scheduleRideData.totalCharges = totalFare;
      scheduleRideData.distance = distanceMiles;
      scheduleRideData.distanceKm = distanceKm;
      scheduleRideData.time = timeMin;

      NewOrder.status = "Accepted";
      NewOrder.driverId = auth._id;
      NewOrder.fareDetails.timeMin = timeMin;
      NewOrder.fareDetails.distanceKm = distanceKm;
      NewOrder.fareDetails.distanceMiles = distanceMiles;
      NewOrder.fareDetails.driverGets = driverGet;
      NewOrder.fareDetails.platformFee = platformFee;
      NewOrder.fareDetails.platformFeePercentage = platformFeePercentage;
      NewOrder.xtracoin = totalFare;

      await NewOrder.save();
    }

    // ----------------------------------------
    // 🔥 5) Delete ride from Redis (no more accept)
    // ----------------------------------------
    await Redisquery.deleteRide(OrderId);


    // ----------------------------------------
    // 📌 6) Release Lock
    // ----------------------------------------
    await Redisquery.releaseRideLock(OrderId, auth._id);


    // ----------------------------------------
    // 📡 7) Update Driver Status ONRIDE
    // ----------------------------------------
    await Redisquery.updateLocation(
      auth._id.toString(),
      lng,
      lat,
      auth?.VehicalType,
      "ONRIDE"
    );


    // ----------------------------------------
    // 🎉 8) Return Success
    // ----------------------------------------
    return res.success(
      "Ride Accepted Successfully",
      orderData || scheduleRideData
    );
  } catch (error) {
    console.error("AcceptRide Error:", error);
    next(error);
  }
};



module.exports.NearRides = async (req, res, next) => {
  try {
    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { lng, lat } = req?.body || {};
    if (!lng || !lat) return res.error(400, "lng and lat are required")
    const RideData = await Redisquery.getNearbyRides(lng, lat)
    console.log({ RideData })
    if (!RideData) return res.success("Do not found any near ride from You", [])
    return res.success("10 Near ride get successfully", RideData)
  } catch (error) {
    next(error);
  }
};


module.exports.ArrivedStatus = async (req, res, next) => {
  try {
    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { OrderId, lng, lat } = req?.body || {};
    if (!OrderId || !lng || !lat) return res.error(400, "All fields required");

    const result = await Queries.findOne(Model.Order, { _id: OrderId });
    if (!result) return res.error(400, "Ride not found for given Id");

    if (result.status === "Arrived") return res.error(400, "You are already marked as arrived. Please start your ride.");

    if (result.status === "Pending") return res.error(400, "Ride not accepted yet. Please accept the ride first.");

    if (result.status !== "Accepted") return res.error(400, "Your Ride is not accepted ");


    const plat = result.pickupLocation.coordinates[1]
    const plng = result.pickupLocation.coordinates[0]


    const distanceResponse = await functions.getDistanceAndTime(parseFloat(plat), parseFloat(plng), parseFloat(lat), parseFloat(lng));
    const Googleresult = distanceResponse?.rows?.[0]?.elements?.[0];

    if (!Googleresult || Googleresult.status !== "OK") {
      throw new Error("Failed to calculate distance/time from Google Maps API");
    }

    const distanceInMeters = Googleresult.distance.value;

    if (distanceInMeters <= 500) {
      console.log("New profile", result?.userId, "status:arrived")
      const UserData = await Queries.findOne(Model.User, { _id: result?.userId })
      await sendNotification(UserData.fcmToken, "🚘 Your Driver Has Arrived", "Your ride is waiting at the pickup point. Please meet your driver now.")
      await PubNub.publishMessage(result?.userId.toString(), { OrderId, status: "Arrived" });

      result.status = "Arrived"
      await result.save()
      const distanceInMiles = (distanceInMeters / 1609.34).toFixed(3);
      return res.success(`You have arrived. Distance: ${distanceInMeters}m (${distanceInMiles} miles)`, { OrderId, distance: `${distanceInMeters}m`, distanceMiles: `${distanceInMiles} miles` });
    }

    const distanceInMiles = (distanceInMeters / 1609.34).toFixed(3);
    return res.error(400, `You have not arrived at pickup point. Distance: ${distanceInMeters}m (${distanceInMiles} miles)`);
  } catch (error) {
    next(error);
  }
};


module.exports.StartRide = async (req, res, next) => {
  try {
    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { OrderId, lng, lat, otp } = req?.body || {};
    if (!OrderId || !lng || !lat || !otp) return res.error(400, "All fields required");

    const result = await Queries.findOne(Model.Order, { _id: OrderId });
    if (!result) return res.error(400, "Ride not found for given Id");

    if (result.status === "Pending") return res.error(400, "Ride not accepted yet. Please accept the ride first.");

    if (result.status === "Accepted") return res.error(400, "You have not arrived at pickup location yet.");

    if (result.status === "Cancelled") return res.error(400, "This ride has been cancelled.");

    if (result.status === "Completed") return res.error(400, "This ride is already completed.");

    if (result.status === "InProgress") return res.error(400, "This ride is already in progress.");

    if (result.status === "Arrived") {
      if (!otp) return res.error(400, "OTP required to start ride.");
      if (Number(otp) !== Number(result?.rideotp)) return res.error(400, "Invalid OTP.");

      result.status = "InProgress";
      await result.save();
      const UserData = await Queries.findOne(Model.User, { _id: result?.userId })
      await sendNotification(
        UserData.fcmToken,
        "🚘 Ride Started",
        "Your ride has just begun. Sit back, relax, and enjoy the journey!"
      );
      await sendNotification(
        auth?.fcmToken,
        "🚘 Ride Started",
        "You’ve successfully started the ride. Drive safely and ensure your passenger has a great Glidr experience!"
      );

      await PubNub.publishMessage(result?.userId.toString(), { OrderId, status: "StartRide" });
      console.log("Ride Start................", result?.userId.toString())
      return res.success("Ride started successfully", result);
    }

    return res.error(400, "Invalid ride status.");
  } catch (error) {
    next(error);
  }
};



module.exports.CancelRide = async (req, res, next) => {
  try {
    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { OrderId, lng, lat, cancelId } = req?.body || {};
    if (!OrderId || !lng || !lat || !cancelId) return res.error(400, "All fields required");

    const DriverData = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!DriverData) return res.error(400, "Driver not found for given Token");

    const result = await Queries.findOne(Model.Order, { _id: OrderId, driverId: auth?._id });
    if (!result) return res.error(400, "Ride not found for given OrderId");
    if (result.status === "Pending") return res.error(400, "You are not able to cancel the ride.");
    if (result.status === "Cancelled") return res.error(400, "This ride already cancelled.");
    if (result.status === "Completed") return res.error(400, "You cannot cancel this ride because it has already been completed.");

    const CancelData = await Queries.findOne(Model.Admin, { _id: cancelId, type: 'DRIVERCANCEL' });
    if (!CancelData) return res.error(400, "This Cancel reason is removed by Admin or invalid Cancel Id");

    const CancelTodayCount = await Queries.countDriverCancellationsToday(auth?._id);

    result.cancelreasonId = cancelId;
    result.cancelby = "DRIVER";
    result.status = "Cancelled";
    await result.save();

    if (CancelTodayCount >= 3) {
      const penalty = result?.fareDetails?.platformFee || 0;

      if (penalty > 0) {
        DriverData.DueWallet += penalty;
        await DriverData.save();
      }
    }
    const UserData = await Queries.findOne(Model.User, { _id: result?.userId })

    await PubNub.publishMessage(result?.userId, { OrderId, status: "Cancelled" });
    await sendNotification(
      UserData.fcmToken,
      "❌ Driver Cancelled Your Ride",
      "We’re sorry! Your driver had to cancel this ride. Please try booking a new one."
    );

    return res.success("Ride Successfully Cancelled", {
      cancelFare: CancelTodayCount >= 3 ? (result?.fareDetails?.platformFee || 0) : 0,
    });

  } catch (error) {
    console.error("CancelRide Error:", error);
    next(error);
  }
};


module.exports.GetDriverCancelReason = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const { getCancelReasonsByType } = require("../../common/cancelReasons");
    const cancelData = await getCancelReasonsByType("DRIVERCANCEL");
    if (!cancelData) {
      return res.error(400, "Cancel reasons are not configured. Add type DRIVERCANCEL in admin collection.");
    }

    return res.success("Cancel Reason Get  successfully.", cancelData);
  } catch (err) {
    console.error("GetDriverCancelReason Error:", err);
    next(err);
  }
};


module.exports.LiveStatus = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const { orderId, lat, lng } = req?.body
    if (!orderId || !lat || !lng) return res.error(400, "all failed are required")
    const OrderData = await Queries.findOne(Model.Order, { _id: orderId, driverId: auth?._id })
    if (!OrderData) return res.error(400, "Ride Not found")
    const distanceResponse = await functions.getDistanceAndTime(parseFloat(lat), parseFloat(lng), parseFloat(OrderData.dropLocation.coordinates[1]), parseFloat(OrderData.dropLocation.coordinates[0]));
    const result = distanceResponse?.rows?.[0]?.elements?.[0];
    const distanceKm = result.distance.value / 1000;
    const distanceMiles = result.distance.value / 1609.34;
    const timeMin = result.duration.value / 60;
    console.log({ distanceKm, distanceMiles, timeMin })
    await PubNub.publishMessage(OrderData.userId.toString(), { time: timeMin, distanceKm, distance: distanceMiles, lat, lng, status: "drop_time" });

    return res.success("Cancel Reason Get  successfully.", timeMin);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};



module.exports.LiveTime = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const { orderId, lat, lng } = req?.body
    if (!orderId || !lat || !lng) return res.error(400, "all failed are required")
    const OrderData = await Queries.findOne(Model.Order, { _id: orderId, driverId: auth?._id })
    if (!OrderData) return res.error(400, "Ride Not found")
    const distanceResponse = await functions.getDistanceAndTime(parseFloat(lat), parseFloat(lng), parseFloat(OrderData.pickupLocation.coordinates[1]), parseFloat(OrderData.pickupLocation.coordinates[0]));
    const result = distanceResponse?.rows?.[0]?.elements?.[0];
    const distanceKm = result.distance.value / 1000;
    const distanceMiles = result.distance.value / 1609.34;
    const timeMin = result.duration.value / 60;
    console.log({ distanceKm, distanceMiles, timeMin })
    await PubNub.publishMessage(OrderData.userId.toString(), { time: timeMin, distanceKm, distance: distanceMiles, lat, lng, status: "time" });

    return res.success("Cancel Reason Get  successfully.", timeMin);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};
module.exports.SumAllData = async (req, res, next) => {
  try {

    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const result = await Queries.SumAllData(auth?._id)
    console.log({ result }, "functions")
    result.name = auth?.name
    result.driverPhoto = auth?.driverPhoto || ""
    // result.level = "basic"
    return res.success("Ride Accepted Successully", result);

  } catch (error) {
    next(error);
  }
};


module.exports.addUserReview = async (req, res, next) => {
  try {
    const auth = req.driver;

    const {
      orderId,
      comment,
      customerBehavior,
      waitingTime,
      hygiene,
      generosity
    } = req.body;

    const review = {
      comment,
      customerBehavior,
      waitingTime,
      hygiene,
      generosity
    };

    const updated = await Model.Order.findOneAndUpdate(
      { _id: orderId, driverId: auth._id },
      { $set: { userreview: review } },
      { new: true }
    );

    if (!updated) return res.error(404, "Order not found or access denied");

    return res.success("User review added successfully");
  } catch (error) {
    next(error);
  }
};



module.exports.CompleteRide = async (req, res, next) => {
  try {
    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { OrderId, lat, lng } = req?.body || {};
    if (!OrderId || !lat || !lng) {
      return res.error(400, "All fields required");
    }

    const order = await Queries.findOne(Model.Order, { _id: OrderId, driverId: auth?._id });
    if (!order) return res.error(400, "Ride not found for given OrderId");

    if (order.status === "Completed") return res.error(400, "Ride already completed");
    if (order.status === "Cancelled") return res.error(400, "Ride cancelled, cannot complete");

    const driver = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!driver) return res.error(400, "Driver not found");

    let { platformFee = 0, driverGets = 0, totalFare = 0, timeMin = 0 } = order.fareDetails || {};

    const { newTotalFare, newDriverGets, newPlatformFee } = await ExtraFare(
      platformFee,
      driverGets,
      totalFare,
      order?.updatedAt,
      timeMin,
      order.vehicleType
    );

    platformFee = newPlatformFee;
    driverGets = newDriverGets;
    totalFare = newTotalFare;

    if (order?.payment?.method === "CASH") {
      if (driver.DueWallet >= 500) {
        return res.error(400, "Driver due wallet exceeds ₹500, cannot collect cash payments");
      }

      driver.Wallet += driverGets;
      driver.DueWallet += platformFee;
    } else if (order?.payment?.method === "ONLINE") {
      console.log("Processing online payment for user:", order?.userId, "amount:", totalFare);
      await autoPay(
        order?.userId,
        totalFare,
        { orderId: order._id.toString(), paymentMethodId: order.paymentMethodId }
      );
      driver.Wallet += driverGets;
    } else {
      return res.error(400, "Invalid payment type");
    }

    order.status = "Completed";
    order.payment.method = order?.payment?.method;
    order.payment.amount = totalFare;
    order.payment.isPaid = order?.payment?.method === "ONLINE";
    order.fareDetails.totalFare = totalFare;
    order.fareDetails.driverGets = driverGets;
    order.fareDetails.platformFee = platformFee;
    order.updatedAt = new Date();

    await order.save();
    await driver.save();

    const UserData = await Queries.findOne(Model.User, { _id: order?.userId });
    UserData.xtracoin = (UserData.xtracoin || 0) + (order?.xtracoin || 0);
    await UserData.save();

    await sendNotification(
      UserData.fcmToken,
      "🎉 Ride Completed",
      `Your ride has ended successfully. Total Fare $${totalFare}. Thank you for riding with us!`
    );

    await sendNotification(
      auth?.fcmToken,
      "🎉 Ride Completed Successfully",
      `Great job! You’ve completed this Glidr trip. Your earnings $${driverGets.toFixed(2)} have been updated.`
    );

    await PubNub.publishMessage(order?.userId, {
      OrderId,
      status: "Completed",
      paymentType: order?.payment?.method,
    });

    return res.success("Ride marked as Completed", {
      OrderId,
      Wallet: driver.Wallet,
      DueWallet: driver.DueWallet,
      paymentType: order?.payment?.method,
      totalFare,
      driverGets,
      platformFee,
    });
  } catch (error) {
    console.error("CompleteRide Error:", error);
    next(error);
  }
};


async function autoPay(id, amount, metadata = {}) {
  try {
    const user = await Queries.findOne(Model.User, { _id: id });

    if (!user?.stripe_customer_id) {
      throw new Error("Customer not found");
    }

    console.log("💳 Starting auto payment for:", user._id);

    // 1️⃣ Get customer
    const customer = await stripe.customers.retrieve(
      user.stripe_customer_id
    );

    // 2️⃣ Get specified payment method, or default
    let paymentMethod = metadata.paymentMethodId || customer.invoice_settings?.default_payment_method;

    // 👉 fallback: get first saved card (FIX: add type)
    if (!paymentMethod) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripe_customer_id,
        type: "card", // ✅ required
      });

      if (!paymentMethods.data.length) {
        throw new Error("No saved payment method found");
      }

      paymentMethod = paymentMethods.data[0].id;
    }

    // 3️⃣ Create & confirm payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd", // change to "inr" if needed
      customer: user.stripe_customer_id,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        userId: user._id.toString(),
        ...metadata,
      },
    });

    // ✅ SUCCESS CASE
    if (paymentIntent.status === "succeeded") {
      console.log("✅ Payment successful:", paymentIntent.id);

      await sendNotification(
        user?.fcmToken,
        "✅ Payment Completed",
        `$${amount} has been auto-debited successfully.`
      );

      return {
        success: true,
        paymentIntent,
      };
    }

    // ⚠️ EDGE CASE (rare)
    if (paymentIntent.status === "requires_action") {
      user.WalletBalance = (user.WalletBalance || 0) + amount; // refund to wallet
      await user.save();
      await sendNotification(
        user?.fcmToken,
        "⚠️ Payment Action Required",
        `Your payment of $${amount} requires verification. Please complete it.`
      );

      return {
        success: false,
        requiresAction: true,
      };
    }

  } catch (error) {
    console.error("❌ Auto payment failed:", error.message);

    let message = "Payment failed. Please try again.";

    // ❌ Authentication required
    if (error.code === "authentication_required") {
      message = `Payment of $${amount} requires authentication. Please complete it.`;
    }

    // ❌ Card declined / insufficient funds
    else if (error.code === "card_declined") {
      message = `Payment of $${amount} failed due to insufficient funds or card issue.`;
    }

    // ❌ No payment method
    else if (error.message === "No saved payment method found") {
      message = "No payment method found. Please add a card.";
    }

    // 🔔 Send FAILURE notification
    await sendNotification(
      user?.fcmToken,
      "❌ Payment Failed",
      message
    );

    return {
      success: false,
      message,
    };
  }
}
// async function autoPay(user, amount, metadata = {}) {
//   try {
//     if (!user?.stripe_customer_id) {
//       throw new Error("Customer not found");
//     }

//     console.log("💳 Starting auto payment for:", user._id);

//     // 1️⃣ Get customer
//     const customer = await stripe.customers.retrieve(
//       user.stripe_customer_id
//     );

//     // 2️⃣ Get default payment method
//     let paymentMethod =
//       customer.invoice_settings?.default_payment_method;

//     // 👉 fallback: get first saved card
//     if (!paymentMethod) {
//       const paymentMethods = await stripe.paymentMethods.list({
//         customer: user.stripe_customer_id,
//       });

//       if (!paymentMethods.data.length) {
//         throw new Error("No saved payment method found");
//       }

//       paymentMethod = paymentMethods.data[0].id;
//     }

//     // 3️⃣ Create & confirm payment (AUTO CHARGE)
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(amount * 100), // ₹ → paise
//       currency: "usd",
//       customer: user.stripe_customer_id,
//       payment_method: paymentMethod,
//       off_session: true, // 🔥 automatic payment
//       confirm: true,
//       metadata: {
//         userId: user._id.toString(),
//         ...metadata,
//       },
//     });

//     console.log("✅ Payment successful:", paymentIntent.id);
//     await sendNotification(
//       user?.fcmToken,
//       "✅ Payment Completed",
//       `$${amount} has been automatically deducted from your account for this ride.`
//     );
//     return {
//       success: true,
//       paymentIntent,
//     };

//   } catch (error) {
//     console.error("❌ Auto payment failed:", error.message);

//     // ⚠️ Handle special Stripe cases
//     if (error.code === "authentication_required") {
//       return {
//         success: false,
//         requiresAction: true,
//         message: "User needs to authenticate payment",
//       };
//     }

//     if (error.code === "card_declined") {
//       return {
//         success: false,
//         message: "Card was declined",
//       };
//     }

//     return {
//       success: false,
//       message: error.message,
//     };
//   }
// }

async function ExtraFare(platformFee, driverGets, totalFare, updatedAt, timeMin, vehicleType) {
  try {
    // 1️⃣ Get pricing from Redis or DB
    console.log({ platformFee, driverGets, totalFare, updatedAt, timeMin, vehicleType })
    let vehicle = await Redisquery.GetItem(`BOOKINGPRICE_${vehicleType}`);
    if (!vehicle) {
      vehicle = await Queries.findOne(Model.Admin, {
        type: "BOOKINGPRICE",
        VehicalType: vehicleType,
      });
      if (!vehicle) throw new Error("Vehicle pricing not found");
      await Redisquery.SetItem(`BOOKINGPRICE_${vehicleType}`, vehicle);
    }

    // 2️⃣ Time difference (in minutes)
    const now = new Date();
    const lastUpdated = new Date(updatedAt);
    const diffMin = Math.floor((now - lastUpdated) / (1000 * 60)); // minutes difference

    let extraFare = 0;
    if (diffMin > timeMin + 5) {
      const extraMinutes = diffMin - timeMin; // total extra time
      const ratePerMin = vehicle.timeprice || 0; // price per minute from DB
      extraFare = extraMinutes * ratePerMin;

      extraFare = Math.round(extraFare / 10) * 10;
    }

    const newTotalFare = totalFare + extraFare;
    const newPlatformFee = platformFee + (extraFare * (vehicle.plateformfees / 100 || 0));
    const newDriverGets = newTotalFare - newPlatformFee;

    return { newTotalFare, newDriverGets, newPlatformFee };
  } catch (error) {
    console.error("ExtraFare Error:", error);
    return { newTotalFare: totalFare, newDriverGets: driverGets, newPlatformFee: platformFee };
  }
}

module.exports.Lifecycle = async (req, res, next) => {
  try {
    const auth = req?.driver;

    // Check for ongoing rides assigned to the driver
    const ongoingRide = await Queries.findOne(Model.Order, {
      driverId: auth._id,
      status: { $in: ["Accepted", "Arrived", "InProgress"] }
    },
      null,
      [
        { path: "userId", select: "name  phone" },
      ]
    );

    if (ongoingRide) {
      // Check if ride is more than 24 hours old and accepted, then cancel
      if (ongoingRide.createdAt && (Date.now() - new Date(ongoingRide.createdAt).getTime()) > 24 * 60 * 60 * 1000 && ongoingRide.status === "Accepted") {
        await Model.Order.updateOne(
          { _id: ongoingRide._id },
          { $set: { status: "Cancelled", cancelby: "DRIVER" } }
        );
        ongoingRide.status = "Cancelled";
        return res.success("Ride cancelled due to timeout", {
          activity: "Ride Cancelled",
          rideData: ongoingRide,
          status: "CANCELLED",
        });
      }
      let status;
      switch (ongoingRide.status) {
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
          status = "ACCEPTED";
      }
      return res.success("Current Activity: Ride In Progress", {
        activity: "Ride In Progress",
        rideData: ongoingRide,
        status,
      });
    }

    // Check driver's online status
    const driver = await Queries.findOne(Model.Driver, { _id: auth._id });
    if (driver && driver.status === "ONLINE") {
      return res.success("Current Activity: Online and Available", {
        activity: "Online and Available",
        rideData: {},
        status: "ONLINE",
      });
    }

    // No active activity
    return res.success("Current Activity: Offline", {
      activity: "Offline",
      rideData: {},
      status: "OFFLINE",
    });

  } catch (error) {
    console.error("Lifecycle Error:", error);
    next(error);
  }
};



module.exports.WalletBalance = async (req, res, next) => {
  try {

    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const result = await Queries.findOne(Model.Driver, { _id: auth?._id }, "Wallet DueWallet")
    if (!result) return res.error(400, "User Not found")
    return res.success("Wallet Get Successully", result);
  } catch (error) {
    next(error);
  }
};

module.exports.FilterWallet = async (req, res, next) => {
  try {

    const auth = req?.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { filterType, startDate, endDate } = req?.query
    if (!filterType) return res.error(400, "filterType is required")

    const result = await Queries.GetDriverBalanceById(Model.Order, auth?._id, filterType, startDate, endDate)
    console.log({ result })
    if (!result) return res.error(400, "User Not found")
    return res.success("Wallet Get Successully", result);
  } catch (error) {
    next(error);
  }
};