const API_ENDPOINT = process.env.API_ENDPOINT;
const functions = require("../../common/functions");
const DriverSessions = require("../../models/mongo/DriverSessions");
const Order = require("../../models/mongo/Order");
const model = require("../../models/mongo");
const mongoose = require("mongoose");

// findOnerecentdata
// findAllfilter
// findAllWithFilter
// findAllWithFilterWithDateRage

// insertOne.js
module.exports.insertOne = async (Model, data) => {
  try {
    const doc = await Model.create(data);
    if (!doc) throw new Error("somethings went wrong")
    return doc
  } catch (error) {
    throw error
  }
};

module.exports.getDatabyType = async (model, type) => {
  try {
    const pipeline = [
      {
        $match: { type, },
      },

    ];

    const results = await model.aggregate(pipeline);

    return results;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
}
// Insertmany.js
module.exports.insertMany = async (Model, data) => {
  try {
    const doc = await Model.insertMany(data);
    if (!doc) {
      throw new Error("Not Any Item Found")
    }

    return doc
  } catch (error) {
    throw error
  }
};

// findOne.js
function smartEncryptFilterObject(obj, encryptedFields = []) {
  const encrypted = {};

  for (const key in obj) {
    const value = obj[key];

    if (encryptedFields.includes(key)) {
      encrypted[key] = functions.encrypt(String(value));
    } else {
      encrypted[key] = value;
    }
  }

  return encrypted;
}

module.exports.findOne = async (Model, filter = {}, projection = null, populate = null) => {
  try {
    const encryptedFields = Model.encryptedFields || [];
    const smartFilter = smartEncryptFilterObject(filter, encryptedFields);

    let query = Model.findOne(smartFilter);
    if (projection) query = query.select(projection);

    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(populate);
      }
    }

    const document = await query.exec();
    return document;

  } catch (error) {
    throw error;
  }
};





module.exports.findOnerecentdata = async (Model, filter = {}, projection = null) => {
  try {
    // Using findOne with optional projection to query the model with the filter
    const encryptedFields = Model.encryptedFields || [];
    const smartFilter = smartEncryptFilterObject(filter, encryptedFields);
    const query = Model.findOne(smartFilter).sort({ updatedAt: -1 }); // Sort by most recently updated

    if (projection) {
      query.select(projection); // Apply projection if provided
    }

    const document = await query.exec();

    // Return the found document, or null if not found
    return document;

  } catch (error) {
    // Throw the error for the calling function to handle
    throw error;
  }
};

module.exports.findAllfilter = async (Model, filters = {}, options = {}) => {
  try {
    let query = Model.find(filters);

    // Projection (fields selection)
    if (options.fields) {
      query = query.select(options.fields); // Example: "name age"
    }

    // Sorting
    if (options.sort) {
      query = query.sort(options.sort); // Example: { name: 1 } or "-name"
    }

    const results = await query.exec();

    if (!results.length) throw new Error("No Data Found");

    return results;
  } catch (error) {
    throw error;
  }
};



// FindAll.js
module.exports.findAll = async (Model, data, projection = {}) => {
  try {
    const encryptedFields = Model.encryptedFields || [];
    const smartFilter = smartEncryptFilterObject(data, encryptedFields);
    const results = await Model.find(smartFilter, projection);
    if (!results) throw new Error("Not Find Any Data")
    return results;
  } catch (error) {
    throw error
  }
};

module.exports.findAllWithFilter = async (Model, filters = {}, projection = {}, options = {}) => {
  try {
    const { sort = {}, searchFields = [], searchQuery = "" } = options;

    let query = { ...filters };

    // 🔍 Handle Search Query (if provided)
    if (searchQuery && searchFields.length > 0) {
      query.$or = searchFields.map((field) => ({
        [field]: { $regex: searchQuery, $options: "i" }, // Case-insensitive search
      }));
    }

    // 🛠 Execute Query with Filters and Sorting (No Pagination)
    const results = await Model.find(query, projection).sort(sort);

    if (!results || results.length === 0) return false;

    return results;
  } catch (error) {
    return false;
  }
};

module.exports.findAllWithFilterWithDateRage = async (Model, filters = {}, projection = {}, options = {}) => {
  try {
    const { sort = {}, searchFields = [], searchQuery = "", filter = {} } = options;

    let query = { ...filters };

    if (searchQuery && searchFields.length > 0) {
      query.$or = searchFields.map((field) => ({
        [field]: { $regex: searchQuery, $options: "i" },
      }));
    }
    if (filter.startDate || filter.endDate) {
      query.updatedAt = {};

      const parseISTDateWithTime = (dateStr, isStart) => {
        // Create the exact ISO timestamp string in IST
        const base = dateStr.split("T")[0]; // "2025-05-14"

        const fullDateStr = isStart
          ? `${base}T00:00:01+05:30`
          : `${base}T23:59:59.999+05:30`;

        return new Date(fullDateStr); // JS converts to correct UTC
      };

      if (filter.startDate) {
        query.updatedAt.$gte = parseISTDateWithTime(filter.startDate, true);
      }

      if (filter.endDate) {
        query.updatedAt.$lte = parseISTDateWithTime(filter.endDate, false);
      }

      console.log("Date filter applied in UTC:", query.updatedAt);
    }

    const results = await Model.find(query, projection).sort(sort);

    if (!results || results.length === 0) return false;
    console.log({ results })
    return results;
  } catch (error) {
    return false;
  }
};
// deletemany.js

module.exports.deleteMany = async (Model, filter) => {
  try {

    const encryptedFields = Model.encryptedFields || [];
    const smartFilter = smartEncryptFilterObject(filter, encryptedFields);
    const deleted = await Model.deleteMany(smartFilter);

    if (!deleted) {
      return res.error(400, " something went wrong ");
    }
    if (valueReturn) return deleted;

  } catch (error) {
    return error
  }
};

// deleteOne.js
// module.exports.deleteOne = async (Model, filter = {}, projection = null) => {
//   try {

//     const document = await Model.findOne(filter, projection);


//     if (!document) {
//       return {
//         success: false,
//         status: 404,
//         message: "Deatils does not exist",
//       };
//     }


//     const data = await Model.deleteOne(filter);



//   } catch (error) {
//     // Log and handle any errors
//     console.error(error);
//     return {
//       success: false,
//       status: 500,
//       message: "Server Error",
//       error: error.message,
//     };
//   }
// };

module.exports.deleteOne = async (Model, filter = {}, projection = null, options = {}) => {
  try {
    // Check if the document exists
    const encryptedFields = Model.encryptedFields || [];
    const smartFilter = smartEncryptFilterObject(filter, encryptedFields);
    const document = await Model.findOne(smartFilter, projection);

    if (!document) {
      // Return null if the document does not exist, similar to findOne's behavior
      return null;
    }

    // Perform the delete operation
    const result = await Model.deleteOne(smartFilter, options);

    // Return true if a document was deleted, false if it wasn't
    return result.deletedCount === 1;

  } catch (error) {
    // Throw the error for the calling function to handle, similar to findOne
    throw error;
  }
};


// deleteSaft.js
// const { updateOne } = require("./updateOne");

module.exports.deleteSaft = async (Model, req, res, next,) => {

  await updateOne(Model, req, res, next)

};

// updateById.js
module.exports.updateById = async (Model, req, res, next, valueReturn) => {
  try {
    const updated = await Model.findByIdAndUpdate(req.checks, req.updateData, {
      new: true,
    });

    if (!updated) {
      return res.error(400, " not found");
    }
    if (valueReturn) return updated;

    res.json({ message: " updated successfully", updated });
  } catch (error) {
    next(error);
  }
};

// updateOne.js
// module.exports.updateOne = async (Model, filter, updatedata) => {
//   try {
//     const updated = await Model.findOneAndUpdate(filter, updatedata, {
//       new: true,
//     });

//     if (!updated) {
//       throw new Error("Data Not found")
//     }

//     return updated
//   } catch (error) {
//     throw error;
//   }
// };

// updateOne.js
module.exports.updateOne = async (Model, filter, updatedata, projection = null) => {
  try {
    const options = { new: true };
    if (projection) {
      options.projection = projection; // Add projection if provided
    }

    const updated = await Model.findOneAndUpdate(filter, updatedata, options);

    if (!updated) {
      throw new Error("Data Not Found");
    }

    return updated;
  } catch (error) {
    throw error;
  }
};


// aggregation.js

module.exports.aggregation = async (Model, req, res, next, valueReturn) => {
  try {
    const aggregationPipeline = [
      // {
      //     $match: {
      //         // Your search condition here
      //         // Example: 'adminId.name': 'specificName'
      //     }
      // },
      {
        $lookup: {
          from: "admins",
          localField: "adminId",
          foreignField: "_id",
          as: "admin",
        },
      },
      {
        $lookup: {
          from: "nfts",
          localField: "nftId",
          foreignField: "_id",
          as: "nft",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
    ];

    const documents = await Model.aggregate(req.pipeline || []).exec();
    req.pipelineRes = documents;

    req.oparationData = req?.oparationData || [];
    req.oparationData.map((operation) => operation());
    await Promise.all(req.oparationData);

    if (valueReturn) return documents;
    res.json({ message: "  successfully", documents });
  } catch (error) {
    next(error);
  }
};

module.exports.fileUpload = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const filesData = req.files.map((file) => {
    const fileId = "uploads";
    const fileName = file.filename;
    return {
      file_name: fileName,
      id: fileId,
      original: `${API_ENDPOINT}/${fileId}/${fileName}`,
      thumbnail: `${API_ENDPOINT}/${fileId}/${fileName}`,
    };
  });
  if (filesData.length > 0) {
    res.json(filesData);
  } else {
    res.json(...filesData);
  }
};

// paginate.js

module.exports.paginateQuery = async (model, req, res, next, valueReturn) => {
  try {
    const checks = req.checks || {};
    const projection = req.projection || {};
    const populateKey = req.populateKey || [];
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.limit) || 15;

    const orderBy = req.query.orderBy || "createdAt";
    const sortedBy = req.query.sortedBy;
    let sortObj = {};

    if (sortedBy == "asc") {
      sortObj = { [orderBy]: 1 };
    } else {
      sortObj = { [orderBy]: -1 };
    }

    // const populateKey = ["adminId", "nftId", "productId"]
    // const populateOptions = populateKey.map(key => ({ path: key }));
    const populateOptions = populateKey.map((item) => {
      return {
        path: item?.path,
        select: item?.select?.join(" "),
      };
    });

    const totalDocuments = await model.countDocuments(checks);
    const totalPages = Math.ceil(totalDocuments / perPage);

    const documents = await model
      .find(checks, projection)
      .populate(populateOptions)
      .sort(sortObj)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .exec();

    req.findAllResponse = documents || [];
    req.oparationData = req?.oparationData || [];
    req.oparationData.map((operation) => operation());
    await Promise.all(req.oparationData);

    const responseData = {
      current_page: page,
      data: documents,
      first_page_url: `${API_ENDPOINT}/products?page=1&limit=${perPage}`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${API_ENDPOINT}/products?page=${totalPages}&limit=${perPage}`,
      links: [
        {
          url: null,
          label: "&laquo; Previous",
          active: page > 1,
        },
        ...Array.from({ length: totalPages }, (_, i) => ({
          url: `${API_ENDPOINT}/products?page=${i + 1}&limit=${perPage}`,
          label: `${i + 1}`,
          active: i + 1 === page,
        })),
        {
          url: `${API_ENDPOINT}/products?page=${page + 1}&limit=${perPage}`,
          label: "Next &raquo;",
          active: page < totalPages,
        },
      ],
      next_page_url:
        page < totalPages
          ? `${API_ENDPOINT}/products?page=${page + 1}&limit=${perPage}`
          : null,
      path: `${API_ENDPOINT}/products`,
      per_page: perPage,
      prev_page_url:
        page > 1
          ? `${API_ENDPOINT}/products?page=${page - 1}&limit=${perPage}`
          : null,
      to: Math.min(page * perPage, totalDocuments),
      total: totalDocuments,
    };
    if (valueReturn) return responseData;
    req.paginateResponse = responseData;

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};





function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports.findAllWithFilterAndPagination_New = async (
  Model,
  filter = {},
  page = 1,
  limit = 10,
  projection = null,
  populateFields = [] // <-- new param for flexibility
) => {
  try {
    console.log({ populateFields })
    const query = {};

    // Handle date filters
    if (filter.startDate || filter.endDate) {
      const dateRange = {};
      if (filter.startDate) {
        const startDate = new Date(filter.startDate);
        if (!isNaN(startDate.getTime())) dateRange.$gte = startDate;
        else throw new Error("Invalid startDate format");
      }
      if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        if (!isNaN(endDate.getTime())) dateRange.$lte = endDate;
        else throw new Error("Invalid endDate format");
      }
      if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;
    }

    // Handle search
    if (filter.searchField && filter.searchValue) {
      const escapedValue = escapeRegex(filter.searchValue);
      query[filter.searchField] = { $regex: new RegExp(escapedValue, "i") };
    }

    // Handle other filters
    Object.keys(filter).forEach((key) => {
      const value = filter[key];
      if (
        value === null ||
        value === undefined ||
        key === "startDate" ||
        key === "endDate" ||
        key === "searchField" ||
        key === "searchValue"
      ) return;

      if (key === "phone" && typeof value === "string") {
        const escapedValue = escapeRegex(value);
        query[key] = { $regex: new RegExp(escapedValue, "i") };
      } else if (typeof value === "boolean") {
        query[key] = value;
      } else if (Array.isArray(value)) {
        query[key] = { $in: value };
      } else if (isPlainObject(value)) {
        Object.keys(value).forEach((operator) => {
          switch (operator) {
            case "$gte":
            case "$lte":
            case "$gt":
            case "$lt":
            case "$ne":
            case "$in":
            case "$nin":
            case "$regex":
              query[key] = { ...query[key], [operator]: value[operator] };
              break;
            default:
              throw new Error(`Unsupported filter operator: ${operator}`);
          }
        });
      } else {
        query[key] = value;
      }
    });

    let queryBuilder = Model.find(query).sort({ createdAt: -1 });

    // Select only specific fields if projection is passed
    if (projection) queryBuilder = queryBuilder.select(projection);

    // ✅ Populate user & driver or any extra fields
    if (populateFields.length > 0) {
      populateFields.forEach((field) => {
        console.log(field)
        queryBuilder = queryBuilder.populate(field);
      });
    }

    let documents;
    if (filter.searchField && filter.searchValue) {
      documents = await queryBuilder.exec();
    } else {
      documents = await queryBuilder.skip((page - 1) * limit).limit(limit).exec();
    }

    const totalDocuments = await Model.countDocuments(query);
    const totalPages =
      filter.searchField && filter.searchValue ? 1 : Math.ceil(totalDocuments / limit);

    return {
      totalDocuments,
      totalPages,
      currentPage: filter.searchField && filter.searchValue ? null : page,
      data: documents,
    };
  } catch (error) {
    console.error("Pagination Query Error:", error);
    throw error;
  }
};






module.exports.GetUserRideStats = async (Model, userId) => {
  try {
    if (!userId) throw new Error("userId is required");

    const result = await Model.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: "$userId",
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          cancelledRides: {
            $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Completed"] },
                { $ifNull: ["$fareDetails.totalFare", 0] },
                0,
              ],
            },
          },
          avgTripCost: {
            $avg: {
              $cond: [
                { $eq: ["$status", "Completed"] },
                { $ifNull: ["$fareDetails.totalFare", 0] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          totalRides: 1,
          completedRides: 1,
          cancelledRides: 1,
          totalSpent: 1,
          avgTripCost: { $ifNull: ["$avgTripCost", 0] },
        },
      },
    ]);

    return (
      result[0] || {
        userId,
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        avgTripCost: 0,
      }
    );
  } catch (error) {
    throw error;
  }
};



module.exports.GetDriverReviewStats = async (Model, driverId) => {
  try {
    const result = await Model.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          status: "Completed",
          driverreview: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalCompletedRides: { $sum: 1 },
          avgBehavior: { $avg: "$driverreview.driverBehavior" },
          avgSkill: { $avg: "$driverreview.drivingSkill" },
          avgSecurity: { $avg: "$driverreview.security" },
          avgHygiene: { $avg: "$driverreview.hygiene" }
        }
      },
      {
        $project: {
          _id: 0,
          totalCompletedRides: 1,
          totalAvgRating: {
            $round: [
              {
                $avg: [
                  "$avgBehavior",
                  "$avgSkill",
                  "$avgSecurity",
                  "$avgHygiene"
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // Return default if no data
    return result[0] || {
      totalCompletedRides: 0,
      totalAvgRating: 0
    };
  } catch (error) {
    console.error("Error in GetDriverReviewStats:", error);
    throw error;
  }
};
module.exports.SumAllData = async (driverId) => {
  try {
    const objectId = new mongoose.Types.ObjectId(driverId);

    // 1️⃣ Total Online Time (convert seconds → hours)
    const totalOnline = await DriverSessions.aggregate([
      { $match: { driverId: objectId } },
      {
        $group: {
          _id: "$driverId",
          totalSeconds: { $sum: "$totalOnlineTime" } // stored in seconds
        }
      },
      {
        $project: {
          _id: 0,
          totalHours: { $divide: ["$totalSeconds", 3600] } // convert to hours
        }
      }
    ]);

    const totalHours = totalOnline[0]?.totalHours || 0;

    // 2️⃣ Ride Stats
    const rideStats = await Order.aggregate([
      { $match: { driverId: objectId, status: "Completed" } },
      {
        $group: {
          _id: "$driverId",
          totalRides: { $sum: 1 },
          totalDistanceKm: { $sum: "$fareDetails.distanceKm" },
          totalDistanceMiles: { $sum: "$fareDetails.distanceMiles" },
          totalEarnings: { $sum: "$fareDetails.driverGets" },
        }
      },
      {
        $project: {
          _id: 0,
          totalRides: 1,
          totalDistanceKm: 1,
          totalDistanceMiles: 1,
          totalEarnings: 1,
        }
      }
    ]);

    const totalRides = rideStats[0]?.totalRides || 0;

    // 3️⃣ Level Calculation
    let level = "basic";
    if (totalRides >= 50 && totalRides <= 150) level = "medium";
    else if (totalRides > 150) level = "advance";

    // 4️⃣ Final Summary (return in hours always)
    return {
      driverId,
      totalHours: +totalHours.toFixed(4), // precise hours (even 1 sec → 0.0003 hr)
      totalRides,
      totalDistance: rideStats[0]?.totalDistance || 0,
      totalEarnings: rideStats[0]?.totalEarnings || 0,
      finalReview: rideStats[0]?.finalReview || 3.5,
      level
    };

  } catch (error) {
    console.error("Error in SumAllData:", error);
    throw error;
  }
};





module.exports.GetDriverRideStats = async (Model, driverId) => {
  try {
    if (!driverId) throw new Error('driverId is required');
    const oid = new mongoose.Types.ObjectId(driverId);

    const [doc] = await Model.aggregate([
      { $match: { driverId: oid } },

      // Compute helpers once, then reuse in both facets
      {
        $addFields: {
          _completed: { $eq: ['$status', 'Completed'] },
          _cancelled: { $eq: ['$status', 'Cancelled'] },
          _driverGets: { $ifNull: ['$fareDetails.driverGets', 0] },
          _ratingArrayRaw: [
            { $ifNull: ['$driverreview.driverBehavior', 0] },
            { $ifNull: ['$driverreview.drivingSkill', 0] },
            { $ifNull: ['$driverreview.security', 0] },
            { $ifNull: ['$driverreview.hygiene', 0] }
          ]
        }
      },
      {
        $addFields: {
          _ratingArray: {
            $filter: {
              input: '$_ratingArrayRaw',
              as: 'r',
              cond: { $gt: ['$$r', 0] } // ignore 0s (no rating)
            }
          }
        }
      },
      {
        $addFields: {
          tripRating: {
            $cond: [
              { $gt: [{ $size: '$_ratingArray' }, 0] },
              { $avg: '$_ratingArray' },
              null
            ]
          }
        }
      },
      {
        $addFields: {
          tripStar: {
            $cond: [
              { $ne: ['$tripRating', null] },
              {
                $min: [
                  5,
                  { $max: [1, { $toInt: { $round: ['$tripRating', 0] } }] }
                ]
              },
              null
            ]
          }
        }
      },

      // Use facet: one branch for stats, one branch for recent reviews
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: '$driverId',
                totalTrips: { $sum: 1 },
                completedTrips: { $sum: { $cond: ['$_completed', 1, 0] } },
                cancelledTrips: { $sum: { $cond: ['$_cancelled', 1, 0] } },
                totalEarn: {
                  $sum: { $cond: ['$_completed', '$_driverGets', 0] }
                },
                ratingSum: {
                  $sum: { $cond: [{ $ne: ['$tripRating', null] }, '$tripRating', 0] }
                },
                ratingCount: {
                  $sum: { $cond: [{ $ne: ['$tripRating', null] }, 1, 0] }
                },
                star1: { $sum: { $cond: [{ $eq: ['$tripStar', 1] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ['$tripStar', 2] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ['$tripStar', 3] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ['$tripStar', 4] }, 1, 0] } },
                star5: { $sum: { $cond: [{ $eq: ['$tripStar', 5] }, 1, 0] } }
              }
            },
            {
              $project: {
                _id: 0,
                driverId: '$_id',
                totalTrips: 1,
                completedTrips: 1,
                cancelledTrips: 1,
                totalEarn: 1,
                completionPercentage: {
                  $cond: [
                    { $gt: ['$totalTrips', 0] },
                    { $multiply: [{ $divide: ['$completedTrips', '$totalTrips'] }, 100] },
                    0
                  ]
                },
                overallRating: {
                  $cond: [
                    { $gt: ['$ratingCount', 0] },
                    { $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 2] },
                    null
                  ]
                },
                ratingSamples: '$ratingCount',
                ratingBreakdown: {
                  star1: '$star1',
                  star2: '$star2',
                  star3: '$star3',
                  star4: '$star4',
                  star5: '$star5'
                },
                ratingBreakdownPercent: {
                  star1: {
                    $cond: [
                      { $gt: ['$ratingCount', 0] },
                      { $multiply: [{ $divide: ['$star1', '$ratingCount'] }, 100] },
                      0
                    ]
                  },
                  star2: {
                    $cond: [
                      { $gt: ['$ratingCount', 0] },
                      { $multiply: [{ $divide: ['$star2', '$ratingCount'] }, 100] },
                      0
                    ]
                  },
                  star3: {
                    $cond: [
                      { $gt: ['$ratingCount', 0] },
                      { $multiply: [{ $divide: ['$star3', '$ratingCount'] }, 100] },
                      0
                    ]
                  },
                  star4: {
                    $cond: [
                      { $gt: ['$ratingCount', 0] },
                      { $multiply: [{ $divide: ['$star4', '$ratingCount'] }, 100] },
                      0
                    ]
                  },
                  star5: {
                    $cond: [
                      { $gt: ['$ratingCount', 0] },
                      { $multiply: [{ $divide: ['$star5', '$ratingCount'] }, 100] },
                      0
                    ]
                  }
                }
              }
            }
          ],

          recentReviews: [
            // Only keep orders with a real non-zero rating
            { $match: { tripRating: { $ne: null } } },
            { $sort: { createdAt: -1 } },
            {
              $project: {
                _id: 0,
                orderId: '$_id',
                comment: { $ifNull: ['$driverreview.comment', ''] },
                rating: { $round: ['$tripRating', 2] },
                createdAt: 1
              }
            },
            { $limit: 2 }
          ]
        }
      },

      // Flatten the facet result into a single document
      {
        $project: {
          stats: { $ifNull: [{ $arrayElemAt: ['$stats', 0] }, null] },
          recentReviews: 1
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              {
                driverId: oid,
                totalTrips: 0,
                completedTrips: 0,
                cancelledTrips: 0,
                totalEarn: 0,
                completionPercentage: 0,
                overallRating: null,
                ratingSamples: 0,
                ratingBreakdown: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
                ratingBreakdownPercent: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
                recentReviews: []
              },
              '$stats',
              { recentReviews: '$recentReviews' }
            ]
          }
        }
      }
    ]);

    return doc || {
      driverId: oid,
      totalTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      totalEarn: 0,
      completionPercentage: 0,
      overallRating: null,
      ratingSamples: 0,
      ratingBreakdown: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
      ratingBreakdownPercent: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
      recentReviews: []
    };
  } catch (err) {
    throw err;
  }
};





module.exports.GetDashboardStats = async (OrderModel, scope = 'today') => {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  const now = new Date();
  let range = null;

  switch (scope) {
    case 'today': {
      const s = startOfDay(now);
      const e = addDays(s, 1);
      range = { start: s, end: e };
      break;
    }
    case 'week': {
      // last 7 days including today
      const e = addDays(startOfDay(now), 1);
      const s = addDays(e, -7);
      range = { start: s, end: e };
      break;
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      range = { start: s, end: e };
      break;
    }
    case 'total':
    default:
      range = null; // no time filter
  }

  const inProgressStatuses = ["Pending", "Accepted", "Arrived", "InProgress"];

  // ---- base match for all facets ----
  const match = {};
  if (range) match.createdAt = { $gte: range.start, $lt: range.end };

  // ---- aggregation ----
  const [doc] = await OrderModel.aggregate([
    { $match: match },

    {
      $facet: {
        total: [{ $count: 'n' }],

        completed: [{ $match: { status: 'Completed' } }, { $count: 'n' }],

        cancelled: [{ $match: { status: 'Cancelled' } }, { $count: 'n' }],

        pending: [{ $match: { status: 'Pending' } }, { $count: 'n' }],

        inProgress: [{ $match: { status: { $in: inProgressStatuses } } }, { $count: 'n' }],

        revenue: [
          { $match: { status: 'Completed', 'payment.isPaid': true } },
          {
            $group: {
              _id: null,
              amount: {
                $sum: {
                  $ifNull: ['$payment.amount', '$fareDetails.totalFare']
                }
              }
            }
          }
        ],
      }
    },

    {
      $project: {
        _id: 0,
        scope: scope,
        from: range ? range.start : null,
        to: range ? range.end : null,

        totalRides: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
        completed: { $ifNull: [{ $arrayElemAt: ['$completed.n', 0] }, 0] },
        cancelled: { $ifNull: [{ $arrayElemAt: ['$cancelled.n', 0] }, 0] },
        pending: { $ifNull: [{ $arrayElemAt: ['$pending.n', 0] }, 0] },
        inProgress: { $ifNull: [{ $arrayElemAt: ['$inProgress.n', 0] }, 0] },

        totalRevenue: {
          $round: [{ $ifNull: [{ $arrayElemAt: ['$revenue.amount', 0] }, 0] }, 2]
        },

        // For convenience in your UI:
        completedToday: { // same as `completed` when scope === 'today'
          $cond: [{ $eq: [scope, 'today'] }, { $ifNull: [{ $arrayElemAt: ['$completed.n', 0] }, 0] }, 0]
        },
      }
    }
  ]);

  // When there's no data at all, doc will be undefined—return zeros
  return doc || {
    scope,
    from: range ? range.start : null,
    to: range ? range.end : null,
    totalRides: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    inProgress: 0,
    totalRevenue: 453,
    completedToday: scope === 'today' ? 0 : 0
  };
};


module.exports.GetTopRiders = async (OrderModel, limit = 5) => {
  const topDrivers = await OrderModel.aggregate([
    { $match: { status: "Completed" } }, // only completed rides

    {
      $group: {
        _id: "$driverId",
        completedRides: { $sum: 1 }
      }
    },

    { $sort: { completedRides: -1 } }, // highest first
    { $limit: limit },

    {
      $lookup: {
        from: "drivers", // your driver collection name
        localField: "_id",
        foreignField: "_id",
        as: "driver"
      }
    },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 0,
        name: "$driver.name",
        completedRides: 1
      }
    }
  ]);

  return topDrivers;
};



module.exports.GetLast7DaysPerformance = async (OrderModel) => {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6); // include today + 6 previous
    startDate.setHours(0, 0, 1, 0); // start of earliest day
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const result = await OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          statuses: { $push: { status: "$_id.status", count: "$count" } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build 7-day sequence
    const labels = [];
    const completed = [];
    const cancelled = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
      labels.push(d.toLocaleDateString("en-US", { weekday: "short" })); // Mon, Tue...

      const dayData = result.find(r => r._id === key);
      if (dayData) {
        const comp = dayData.statuses.find(s => s.status === "Completed");
        const canc = dayData.statuses.find(s => s.status === "Cancelled");
        completed.push(comp ? comp.count : 0);
        cancelled.push(canc ? canc.count : 0);
      } else {
        completed.push(0);
        cancelled.push(0);
      }
    }

    return {
      labels,     // e.g. ["Tue","Wed","Thu","Fri","Sat","Sun","Mon"]
      completed,  // array of counts
      cancelled
    };
  } catch (err) {
    console.error("GetLast7DaysPerformance error:", err);
    throw err;
  }
};



module.exports.countDriverCancellationsToday = async (driverId) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await Order.countDocuments({
      driverId: driverId,
      status: "Cancelled",
      cancelby: "DRIVER",
      updatedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (count === null) throw new Error("Something went wrong");
    return count;
  } catch (error) {
    throw error;
  }
};





module.exports.GetDriverBalanceById = async (
  OrderModel,
  driverId,
  filterType,
  startDate = null,
  endDate = null
) => {
  try {
    const matchQuery = {
      driverId: new mongoose.Types.ObjectId(driverId),
      status: { $in: ["Completed", "Refund"] },
    };

    // 🔹 Filter for today's rides
    if (filterType === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      matchQuery.updatedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    // 🔹 Custom date range
    if (filterType === "date" && startDate && endDate) {
      matchQuery.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 🔹 Aggregation pipeline
    const result = await OrderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$driverId",
          totalBalance: { $sum: "$fareDetails.driverGets" }, // total driver earnings
          totalTollFees: { $sum: "$fareDetails.tollFees" }, // total tolls
          totalDistanceKm: { $sum: "$fareDetails.distanceKm" }, // total kilometers
          totalDistanceMiles: { $sum: "$fareDetails.distanceMiles" }, // total miles
          totalRides: { $sum: 1 }, // total trips
        },
      },
      {
        $project: {
          _id: 0,
          driverId: "$_id",
          totalBalance: { $ifNull: ["$totalBalance", 0] },
          totalTollFees: { $ifNull: ["$totalTollFees", 0] },
          totalDistanceKm: { $ifNull: ["$totalDistanceKm", 0] },
          totalDistanceMiles: { $ifNull: ["$totalDistanceMiles", 0] },
          totalRides: { $ifNull: ["$totalRides", 0] },
        },
      },
    ]);

    // 🔹 Return default if no rides
    return result.length > 0
      ? result[0]
      : {
        driverId,
        totalBalance: 0,
        totalTollFees: 0,
        totalDistance: 0,
        totalRides: 0,
      };
  } catch (error) {
    console.error("GetDriverBalanceById Error:", error);
    throw new Error("Failed to fetch driver balance");
  }
};

