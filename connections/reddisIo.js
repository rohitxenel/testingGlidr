const { Queue } = require("bullmq");
const IORedis = require("ioredis");

function createRedisConnection() {
  return new IORedis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,   //  REQUIRED
    password: process.env.REDIS_PASSWORD,   // REQUIRED
                                 //  REQUIRED for Redis Cloud
    maxRetriesPerRequest: null,             //  Required for BullMQ
    enableReadyCheck: false                 //  Recommended for Redis Cloud
  });
}

let rideQueue;

async function getRideQueue() {
  if (!rideQueue) {
    rideQueue = new Queue("rides", {
      connection: createRedisConnection()
    });
    console.log("✅ Ride queue initialized");
  }
  return rideQueue;
}

module.exports = { getRideQueue, createRedisConnection };
