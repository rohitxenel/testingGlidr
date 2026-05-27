const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const { sendEmail } = require('../../services/email')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const Redisquery = require("../../queries/redis/query");
const { redis } = require("googleapis/build/src/apis/redis");
const PubNub = require("../../common/pubnub");



module.exports.order = async ({ plng, plat, dlng, dlat, pickup, drop, vehicleType, paymentType, userId, driverId, rideOTP, paymentMethodId }) => {
  console.log({ plng, plat, dlng, dlat, pickup, drop, vehicleType, paymentType, userId, rideOTP, paymentMethodId })
  try {
    if (!plng || !plat || !dlng || !dlat || !pickup || !drop || !vehicleType || !paymentType || !userId || !driverId) {
      throw new Error("All fields are required");
    }

    const fare = await calculateFare(plat, plng, dlat, dlng, vehicleType);
    const orderData = {
      userId,
      driverId,
      pickupLocation: {
        address: pickup,
        coordinates: [plng, plat],
      },
      dropLocation: {
        address: drop,
        coordinates: [dlng, dlat],
      },
      vehicleType: vehicleType,
      rideType: "Now",
      status: "Accepted",
      fareDetails: {
        baseFare: fare.baseFare,
        distanceFare: fare.distanceFare,
        timeFare: fare.timeFare,
        subtotal: fare.subtotal,
        surge: fare.surge,
        tollFees: fare.tollFees,
        platformFee: fare.platformFee,
        platformFeePercentage: fare.platformFeePercentage,
        totalFare: fare.totalFare,
        driverGets: fare.driverGets,
        distanceKm: fare.distanceKm,
        distanceMiles: fare.distanceMiles,
        timeMin: fare.timeMin,
      },
      xtracoin: fare.totalFare,
      rideotp: rideOTP,
      payment: {
        method: paymentType,
        amount: fare.totalFare,
        isPaid: false,
      },
      paymentMethodId: paymentMethodId || null,
    };
    const insertedOrder = await Queries.insertOne(Model.Order, orderData);

    return {
      orderId: insertedOrder._id,
      totalCharges: fare.totalFare,
      distance: fare.distanceMiles, // Defaulting to miles for response as requested previously
      distanceKm: fare.distanceKm,
      time: fare.timeMin,
    };
  } catch (error) {
    console.error("Error in order creation:", error);
    const err = new Error("Failed to create order");
    err.statusCode = 400;
    throw err;
  }
};

const calculateFare = async (plat, plng, dlat, dlng, vehicleType) => {
  try {
    let vehicle = await Redisquery.GetItem(`BOOKINGPRICE_${vehicleType}`);
    if (!vehicle) {
      vehicle = await Queries.findOne(Model.Admin, { type: "BOOKINGPRICE", VehicalType: vehicleType });
      if (!vehicle) throw new Error("Vehicle pricing not found");
      await Redisquery.SetItem(`BOOKINGPRICE_${vehicleType}`, vehicle);
    }

    const distanceResponse = await functions.getDistanceAndTime(parseFloat(plat), parseFloat(plng), parseFloat(dlat), parseFloat(dlng));
    const result = distanceResponse?.rows?.[0]?.elements?.[0];

    if (!result || result.status !== "OK") {
      throw new Error("Failed to calculate distance/time from Google Maps API");
    }

    const distanceKm = result.distance.value / 1000;
    const distanceMiles = result.distance.value / 1609.34;
    const timeMin = result.duration.value / 60;

    const base = vehicle.baseprice || 0;
    const distPrice = (vehicle.distaceprice || 0) * distanceKm;
    // const timePrice = (vehicle.timeprice || 0) * timeMin;

    const subtotal = base + distPrice;
    const surgeMultiplier = 1.5;
    const surge = (surgeMultiplier - 1) * subtotal;

    const tollFees = vehicle.tollFees || 0;
    const platformFeePercentage = vehicle.plateformfees || 0;
    const platformFee = (platformFeePercentage / 100) * subtotal;
    const totalFare = +(subtotal + surge + Number(tollFees || 0) + platformFee).toFixed(2);

    const platformFeeRounded = +(platformFee).toFixed(2);
    const driverGets = +(totalFare - platformFeeRounded).toFixed(2);

    return {
      baseFare: +(base).toFixed(2),
      distanceFare: +(distPrice).toFixed(2),
      timeFare: 0,
      subtotal: +(subtotal).toFixed(2),
      surge: +(surge).toFixed(2),
      tollFees: +(tollFees).toFixed(2),
      platformFee: platformFeeRounded,
      platformFeePercentage,
      totalFare: totalFare,
      driverGets: driverGets,
      distanceKm: +distanceKm.toFixed(2),
      distanceMiles: +distanceMiles.toFixed(2),
      timeMin: +timeMin.toFixed(2),
    };
  } catch (error) {
    console.error("Error calculating fare:", error);
    const err = new Error("Failed to calculate fare");
    err.statusCode = 400;
    throw err;
  }
};







