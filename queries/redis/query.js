const { redisClient } = require('../../connections/reddis')

const GEO_KEY = "driver_location"


module.exports.SetItem = async (key, value, expirySeconds = 3600) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");
    const setData = await client.set(key, JSON.stringify(value), { EX: expirySeconds });
    console.log(`Key '${key}' set with expiry of ${expirySeconds} seconds`);
    return setData;
  } catch (error) {
    console.error("Redis connection failed:", error);
    throw error;
  }
};

module.exports.GetItem = async (key) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    const value = await client.get(key);
    if (value == null) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error("Redis connection failed:", error);
    throw error;
  }
};

module.exports.GetItemToSaveWithLocation = async (key) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    const data = await client.hGetAll(key); // returns { field: value }

    if (!data || Object.keys(data).length === 0) return null;

    // Convert [Object: null prototype] to plain object
    const plainObj = Object.assign({}, data);

    return plainObj;
  } catch (error) {
    console.error("Redis connection failed:", error);
    throw error;
  }
};

/** Remove ride_meta if the driver-search window expired (default 5 min, matches insertRide TTL). */
module.exports.getActiveRideMetaOrClearStale = async (rideId, maxAgeSeconds = 300) => {
  const metaKey = `ride_meta:${String(rideId)}`;
  try {
    const meta = await module.exports.GetItemToSaveWithLocation(metaKey);
    if (!meta) {
      console.log("[Redis] ride_meta: none", { rideId, metaKey });
      return null;
    }

    const lastUpdated = parseInt(meta.lastUpdated, 10);
    if (lastUpdated) {
      const ageSeconds = Math.floor(Date.now() / 1000) - lastUpdated;
      if (ageSeconds > maxAgeSeconds) {
        console.log("[Redis] ride_meta: stale — deleting", { rideId, ageSeconds, maxAgeSeconds });
        await module.exports.deleteRide(rideId);
        return null;
      }
    }

    console.log("[Redis] ride_meta: active", { rideId, vehicleType: meta.vehicleType, status: meta.status });
    return meta;
  } catch (error) {
    console.error("[Redis] getActiveRideMetaOrClearStale failed:", { rideId, message: error.message });
    throw error;
  }
};



// 🚀 Delete a ride (location + metadata)
module.exports.deleteRide = async (rideId) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    await client.zRem("ride_location", String(rideId));

    const metaKey = `ride_meta:${String(rideId)}`;
    await client.del(metaKey);
    console.log(`Delete rides Ride successfully`, { metaKey })
    return { success: true, rideId };
  } catch (error) {
    console.error("Redis deleteRide failed:", error);
    throw error;
  }
};


module.exports.acquireRideLock = async (rideId, driverId) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    const lockKey = `ride_lock:${rideId}`;

    // Try to create lock for 10 seconds
    const result = await client.set(lockKey, String(driverId), {
      NX: true,
      PX: 10000, // lock expires in 10 sec
    });

    return result === "OK"; // true only if first driver gets it
  } catch (error) {
    console.error("Redis Lock Error:", error);
    return false;
  }
};

module.exports.releaseRideLock = async (rideId, driverId) => {
  try {
    const client = redisClient();
    const lockKey = `ride_lock:${rideId}`;

    const owner = await client.get(lockKey);
    if (owner === String(driverId)) {
      await client.del(lockKey);
    }
  } catch (error) {
    console.error("Redis Unlock Error:", error);
  }
};

module.exports.DeleteItem = async (key) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    const result = await client.del(key);
    console.log(`Key '${key}' deleted:`, result > 0 ? "Success" : "Not found");
    return result > 0;
  } catch (error) {
    console.error("Failed to delete Redis key:", error);
    throw error;
  }
};


module.exports.updateLocation = async (driverId, lng, lat, vehicleType, Status, ttlSeconds = 36000 , fcmToken) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    await client.sendCommand([
      "GEOADD",
      "driver_location",
      String(lng),
      String(lat),
      String(driverId),
    ]);

    const metaKey = `driver_meta:${String(driverId)}`;
    await client.hSet(metaKey, {
      vehicleType: String(vehicleType),
      status: Status,
      lastUpdated: Math.floor(Date.now() / 1000),
      fcmToken: String(fcmToken),
    });

    await client.expire(metaKey, ttlSeconds);

    console.log("[Redis] driver location updated", {
      driverId,
      lng,
      lat,
      vehicleType,
      status: Status,
    });
    return { success: true, ttlSeconds };
  } catch (error) {
    console.error("[Redis] updateLocation failed:", { driverId, message: error.message });
    throw error;
  }
};


module.exports.insertRide = async (rideId, lng, lat, rideMeta = {}, ttlSeconds = 36000) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    await client.sendCommand([
      "GEOADD",
      "ride_location",
      String(lng),
      String(lat),
      String(rideId),
    ]);

    const metaKey = `ride_meta:${String(rideId)}`;
    await client.hSet(metaKey, {
      ...Object.fromEntries(Object.entries(rideMeta).map(([k, v]) => [k, String(v)])),
      lastUpdated: Math.floor(Date.now() / 1000),
    });

    await client.expire(metaKey, ttlSeconds);

    console.log("[Redis] insertRide OK", {
      rideId,
      metaKey,
      ttlSeconds,
      lng,
      lat,
      vehicleType: rideMeta?.vehicleType,
      paymentType: rideMeta?.paymentType,
    });
    return { success: true, rideId, ttlSeconds };
  } catch (error) {
    console.error("[Redis] insertRide failed:", { rideId, message: error.message });
    throw error;
  }
};

module.exports.getNearbyRides = async (lng, lat, radiusMeters = 60000, count = 10) => {
  try {
    const client = redisClient();
    if (!client) throw new Error("Redis client not initialized");

    const rides = await client.sendCommand([
      "GEOSEARCH",
      "ride_location",
      "FROMLONLAT", String(lng), String(lat),
      "BYRADIUS", String(radiusMeters), "m",
      "ASC",
      "COUNT", String(count)
    ]);
    console.log({ rides })
    const rideDetails = [];
    for (const rideId of rides) {
      console.log({ rideId })
      const metaKey = `ride_meta:${rideId}`;
      const meta = await client.hGetAll(metaKey);
      console.log({ meta })
      if (meta && Object.keys(meta).length > 0) {
        rideDetails.push({
          id: rideId,
          ...meta,
        });
      }
    }

    return rideDetails;
  } catch (error) {
    console.error("Redis getNearbyRides failed:", error);
    throw error;
  }
};


module.exports.GetallNearByDriver = async (
  lng,
  lat,
  vehicleType = "BASIC",
  radiusInKm = 50,
) => {
  const client = redisClient();
  if (!client) throw new Error("Redis client not initialized");

  try {
    // Validate and clean inputs
    const cleanLng = parseFloat(String(lng).trim());
    const cleanLat = parseFloat(String(lat).trim());

    if (isNaN(cleanLng) || isNaN(cleanLat)) {
      throw new Error("Invalid coordinates provided");
    }

    // Get nearby drivers with distance and coordinates
    const rawDrivers = await client.sendCommand([
      'GEORADIUS',
      'driver_location',
      cleanLng.toString(),
      cleanLat.toString(),
      radiusInKm.toString(),
      'km',
      'WITHDIST',    // Include distance
      'WITHCOORD',   // Include coordinates
      'ASC'          // Sort by distance (nearest first)
    ]);

    // Process drivers in parallel for better performance
    const driverPromises = rawDrivers.map(async (driverData) => {
      const [driverId, distance, [longitude, latitude]] = driverData;

      // Get driver metadata in parallel
      const meta = await client.hGetAll(`driver_meta:${driverId}`);

      return {
        driverId,
        distance: parseFloat(distance),
        distanceMiles: parseFloat(distance) * 0.621371,
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        vehicleType: meta?.vehicleType,
        lastUpdated: meta?.lastUpdated,
        status: meta?.status,
        fcmToken: meta?.fcmToken
      };
    });

    const allDrivers = await Promise.all(driverPromises);
    // Filter by vehicle type and validate data
    const filteredDrivers = allDrivers.filter(driver => {
      return driver.vehicleType === vehicleType &&
        !isNaN(driver.distance) &&
        !isNaN(driver.longitude) &&
        !isNaN(driver.latitude) &&
        driver.status !== "OFFLINE" &&
        driver.status !== "ONRIDE"
    });

    // Sort by distance (ascending - nearest first)
    filteredDrivers.sort((a, b) => a.distance - b.distance);

    console.log("[Redis] nearby drivers", {
      vehicleType,
      lng: cleanLng,
      lat: cleanLat,
      radiusKm: radiusInKm,
      rawCount: rawDrivers?.length || 0,
      afterFilter: filteredDrivers.length,
      statuses: filteredDrivers.map((d) => ({ id: d.driverId, status: d.status })),
    });

    return filteredDrivers;
  } catch (error) {
    console.error("[Redis] GetallNearByDriver failed:", {
      message: error.message,
      lng,
      lat,
      vehicleType,
    });
    throw new Error("Unable to retrieve nearby drivers");
  }
};






exports.storeRideChatMessage = async (rideId, messageData) => {
  const client = redisClient();
  const key = `chat:ride:${rideId}`;

  await client.rPush(key, JSON.stringify(messageData));

  // Set TTL if not already set
  const ttl = await client.ttl(key);
  //   if (ttl === -1) {
  //     await client.expire(key, CHAT_EXPIRY_SECONDS);
  //   }
};


exports.getRideChatMessages = async (rideId) => {
  const client = redisClient();
  const key = `chat:ride:${rideId}`;

  const rawMessages = await client.lRange(key, 0, -1);
  return rawMessages.map((msg) => JSON.parse(msg));
};


exports.deleteRideChat = async (rideId) => {
  const client = redisClient();
  const key = `chat:ride:${rideId}`;

  await client.del(key);
};
