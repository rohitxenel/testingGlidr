// common/scheduleWorker.js
const { Worker } = require("bullmq");
const { createRedisConnection } = require("../connections/reddisIo");
const PubNub = require("./pubnub");
const Redisquery = require("../queries/redis/query");
const Model = require("../models/mongo");
const Queries = require("../queries/mongo/DBQueries");

const notifyDrivers = async (drivers, payload) => {
  for (let driver of drivers) {
    console.log("👉 Notifying driver", driver.driverId);
    await PubNub.publishMessage(driver.driverId, payload);
  }
};

async function startRideWorker() {
  const worker = new Worker(
    "rides",
    async (job) => {
      console.log(`⏰ Worker picked job '${job.id}'`, job.data);

      const { orderId } = job.data;

      const RideData = await Queries.findOne(Model.Order, {
        _id: orderId,
        status: { $ne: "Cancelled" },
      });

      if (!RideData) {
        console.log(`⚠️ Ride ${orderId} not found or cancelled`);
        return;
      }

      const { pickupLocation, dropLocation, vehicleType, fareDetails, payment, name, profile } = RideData;
      const [plng, plat] = pickupLocation.coordinates;
      const [dlng, dlat] = dropLocation.coordinates;

      const drivers = await Redisquery.GetallNearByDriver(parseFloat(plng), parseFloat(plat), vehicleType);

      if (!drivers.length) {
        console.log(`⚠️ No drivers found for ride ${orderId}`);
        return;
      }

      await notifyDrivers(drivers, {
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

      console.log(`📨 Notified ${drivers.length} drivers for ride ${orderId}`);
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });

  return worker;
}

module.exports = { startRideWorker };
