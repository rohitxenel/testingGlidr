const moment = require("moment-timezone");
const { startCronJob, stopCronJob } = require("./cronjob");
const Model = require("../models/mongo");
const Queries = require("../queries/mongo/DBQueries");
const Redisquery = require("../queries/redis/query");
const PubNub = require("./pubnub");
const { sendNotification } = require("../connections/firebase");

async function notifyDriversForRide(orderId) {
  const RideData = await Queries.findOne(Model.Order, { _id: orderId });

  if (!RideData) {
    console.log(`⚠️ Ride ${orderId} not found.`);
    return false;
  }

  if (RideData.status !== "Pending") {
    console.log(`🛑 Ride ${orderId} is ${RideData.status}. No need to resend.`);
    return false;
  }

  // 🔹 Notify user before ride starts (OTP alert)
  if (RideData?.userId && RideData?.rideotp) {
    const userData = await Queries.findOne(Model.User, { _id: RideData.userId });
    if (userData?.fcmToken) {
      await sendNotification(
        userData.fcmToken,
        "🚗 Your Scheduled Ride is About to Start",
        `Your ride OTP is ${RideData.rideotp}. Please be ready at the pickup location.`
      );
      console.log(`📩 Pre-start notification sent to user for ride ${orderId}`);
    }
  }

  // 🔹 Send ride request to drivers
  const { pickupLocation, dropLocation, vehicleType, fareDetails, payment, name, profile } = RideData;
  const [plng, plat] = pickupLocation.coordinates;
  const [dlng, dlat] = dropLocation.coordinates;

  const drivers = await Redisquery.GetallNearByDriver(parseFloat(plng), parseFloat(plat), vehicleType);
  if (!drivers?.length) {
    console.log(`⚠️ No nearby drivers found for ride ${orderId}`);
    return true;
  }

  for (let driver of drivers) {
    console.log("👉 Sending request to driver:", driver.driverId);
    await PubNub.publishMessage(driver.driverId, {
      plng, plat, dlng, dlat,
      pickup: pickupLocation.address,
      drop: dropLocation.address,
      distance: fareDetails?.distanceMiles,
      distanceKm: fareDetails?.distanceKm,
      totalfare: fareDetails?.totalFare,
      paymentType: payment?.method,
      OrderId: RideData._id,
      name,
      profile,
    });
  }

  console.log(`📨 Ride ${orderId}: Sent to ${drivers.length} drivers`);
  return true;
}

async function scheduleRide(orderId, userId, date, time, minutesBefore = 1) {
  const rideMoment = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata");
  const triggerMoment = rideMoment.clone().subtract(minutesBefore, "minutes");

  const minute = triggerMoment.minute();
  const hour = triggerMoment.hour();
  const day = triggerMoment.date();
  const month = triggerMoment.month() + 1;
  const cronPattern = `${minute} ${hour} ${day} ${month} *`;
  const jobName = `ride_${orderId}`;

  startCronJob(jobName, cronPattern, async () => {
    console.log(`⏰ Cron triggered for ride ${orderId} (user: ${userId})`);

    let attempt = 1;
    let isFirstRun = true;

    const sendAndCheck = async () => {
      const ride = await Queries.findOne(Model.Order, { _id: orderId });
      if (!ride) {
        console.log(`⚠️ Ride ${orderId} not found. Stopping.`);
        stopCronJob(jobName);
        return;
      }

      if (ride.status !== "Pending") {
        console.log(`🛑 Ride ${orderId} is now ${ride.status}. Stopping retries.`);
        stopCronJob(jobName);
        return;
      }

      // ✅ Store in Redis on FIRST RUN only
      if (isFirstRun) {
        try {
          const { pickupLocation, dropLocation, fareDetails, payment, rideotp, userId, name, phone, profile } = ride;
          const [plng, plat] = pickupLocation.coordinates;
          const [dlng, dlat] = dropLocation.coordinates;
          const userData = await Queries.findOne(Model.User, { _id: ride.userId })
          const orderData = {
            plng,
            plat,
            dlng,
            dlat,
            pickup: pickupLocation.address,
            drop: dropLocation.address,
            vehicleType: ride.vehicleType,
            paymentType: payment.method,
            rideType: ride.rideType,
            rideOTP: rideotp,
            distance: fareDetails.distanceMiles,
            distanceKm: fareDetails.distanceKm,
            totalfare: fareDetails.totalFare,
            orderId: ride._id,
            userId: userData._id,
            name: userData.name,
            phone: userData.phone,
            profile: userData.profileImage || "",
            fcmToken: userData.fcmToken || "",
          };

          await Redisquery.insertRide(ride._id.toString(), plng, plat, orderData, 300); // TTL = 5 min
          console.log(`🧠 Stored ride meta in Redis for ${orderId}`);
        } catch (err) {
          console.error("❌ Failed to store ride meta in Redis:", err);
        }
        isFirstRun = false;
      }

      console.log(`🔁 Attempt ${attempt}/5 → notifying drivers for ride ${orderId}`);
      await notifyDriversForRide(orderId);

      // ⛔ On 5th attempt, notify user that no drivers available
      if (attempt >= 5) {
        console.log(`⚠️ Ride ${orderId} reached 5 attempts. No drivers available.`);
        try {
          const userData = await Queries.findOne(Model.User, { _id: userId });
          if (userData?.fcmToken) {
            await sendNotification(
              userData.fcmToken,
              "🚫 No Drivers Available",
              "We’re sorry, no drivers could be assigned to your scheduled ride. Please try booking manually."
            );
            console.log(`📩 Final unavailability message sent to user for ride ${orderId}`);
          }
        } catch (err) {
          console.error("❌ Failed to send no-driver message:", err);
        }
        stopCronJob(jobName);
        return;
      }

      attempt++;
      setTimeout(sendAndCheck, 30 * 1000); // retry every 30 seconds
    };

    await sendAndCheck();
  });

  console.log(`📅 Ride ${orderId} scheduled for ${triggerMoment.format("YYYY-MM-DD HH:mm:ss")} (IST)`);
}

module.exports = { scheduleRide };
