const Model = require("../models/mongo");
const Queries = require("../queries/mongo/DBQueries");
const Redisquery = require("../queries/redis/query");

/** Redis keys — must match Admin cache invalidation (`${type}REASON`) */
const CACHE_KEYS = {
  USERCANCEL: "USERCANCELREASON",
  DRIVERCANCEL: "DRIVERCANCELREASON",
};

const ALLOWED_TYPES = ["USERCANCEL", "DRIVERCANCEL"];

function formatCancelReasonRows(rows) {
  return rows.map((row) => {
    const doc = typeof row.toJSON === "function" ? row.toJSON() : row;
    return {
      _id: doc._id,
      id: doc._id,
      cancelreason: doc.cancelreason,
      reason: doc.cancelreason,
      type: doc.type,
      status: doc.status,
    };
  });
}

/**
 * Load cancel reasons from `admin` collection (same DB you edit directly).
 * Documents must have: type = USERCANCEL | DRIVERCANCEL, cancelreason, status: true
 */
async function getCancelReasonsByType(type, { useCache = true } = {}) {
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error("Invalid cancel reason type");
  }

  const cacheKey = CACHE_KEYS[type];

  if (useCache) {
    const cached = await Redisquery.GetItem(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  const rows = await Queries.findAll(
    Model.Admin,
    { type, status: { $ne: false } },
    { cancelreason: 1, status: 1, type: 1 }
  );

  if (!rows || rows.length === 0) return null;

  const formatted = formatCancelReasonRows(rows);

  if (useCache) {
    await Redisquery.SetItem(cacheKey, formatted, 86400);
  }

  return formatted;
}

async function invalidateCancelReasonCache(type) {
  const cacheKey = CACHE_KEYS[type];
  if (cacheKey) await Redisquery.DeleteItem(cacheKey);
}

module.exports = {
  ALLOWED_TYPES,
  CACHE_KEYS,
  getCancelReasonsByType,
  invalidateCancelReasonCache,
};
