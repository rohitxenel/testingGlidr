const redis = require("redis");

let client;

module.exports.redisdb = async () => {
  try {
    if (client?.isOpen) {
      console.log("Redis already connected.");
      return client;
    }

    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        tls: {},
      },
      username: process.env.REDIS_USERNAME, // MUST exist
      password: process.env.REDIS_PASSWORD,
    });

    client.on("error", (err) => {
      console.error("[Redis] connection error:", err.message);
    });

    await client.connect();
    console.log("[Redis] connected", {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      username: process.env.REDIS_USERNAME,
    });
    return client;
  } catch (error) {
    console.error("Redis connection failed:", error);
    throw error;
  }
};

module.exports.redisClient = () => {
  if (!client || !client.isOpen) {
    console.error("[Redis] client not ready — isOpen:", client?.isOpen);
    throw new Error("Redis client is not connected. Call redisdb() first.");
  }
  return client;
};
