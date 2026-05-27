const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const service = require('../../services')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const Redisquery = require("../../queries/redis/query")
const common = require('../../common')



module.exports.ApprovedDriverKYC = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id, status } = req?.body
    if (!id || !status) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Driver, { _id: id })
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)
    user.isadminVerified = status
    await user.save()
    await service.Email.sendDriverKYCApprovedEmail(user?.email, "Your KYC Has Been Approved – Start Driving with Glidr!", user?.name)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports.GetAllDriver = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    console.log({ filter })

    const page = req?.query?.page;
    const limit = req?.query?.limit;
    const projection = "name phone country email status isaddbank isaddlicense isadminVerified isvehicleDetails isBlocked isDeleted"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Driver,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.getDriverbyId = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id } = req?.query
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Driver, { _id: id })
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.BlockdriverById = async (req, res, next) => {
  try {
    const auth = req.admin;
    if (!auth || !auth._id) return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);

    const { id, block, deleted } = req.body || {};
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID);

    const user = await Queries.findOne(Model.Driver, { _id: id });
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND);

    if (deleted) {
      await service.Email.sendAdminDeletedUserEmail(
        user.email,
        "Your Account Has Been Deleted",
        user.name,
        "Violation of our platform policy"
      );
      user.isDeleted = true;
      await user.save();
      return res.success(common.constants.RESPONSE_MESSAGES.DELETE_SUCCESS, user);
    }

    user.isBlocked = !!block;
    await user.save();

    const emailFn = block
      ? service.Email.sendAdminBlockedUserEmail
      : service.Email.sendAdminUnblockedUserEmail;

    await emailFn(
      user.email,
      block ? "Your Account Has Been Blocked" : "Welcome Back - Your Account is Unblocked",
      user.name,
      block ? "Violation of our platform policy" : undefined
    );

    return res.success(
      block
        ? common.constants.RESPONSE_MESSAGES.BLOCK_SUCCESS
        : common.constants.RESPONSE_MESSAGES.UNBLOCK_SUCCESS,
      user
    );
  } catch (err) {
    console.error(err);
    next(err);
  }
};


module.exports.GetAllTripBydriverId = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const { driverId } = req?.query
    if (!driverId) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = ""
    filter.driverId = driverId
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}


module.exports.GetTripById = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { tripId } = req?.query
    if (!trip) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED)
    const tripData = await Queries.findOne(Model.Order, { _id: tripId }, null, ["driver", "Users"])
    if (!tripData) return res.error(400, common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND)

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, tripData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.VerifyDocuments = async (req, res, next) => {
  try {
    const auth = req.admin;
    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }

    const { driverId, status, reason } = req?.body;
    if (!driverId) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED);
    if (status === undefined) return res.error(400, "status required");

    const driverData = await Queries.findOne(Model.Driver, { _id: driverId }, null);
    if (!driverData) return res.error(404, common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND);

    if (status === true) {
      driverData.isvehicleVerified = true;
      driverData.islicenseVerified = true;
      driverData.isbankVerified = true;
      driverData.isadminVerified = true;
    } else {
      // If status is false → check reason array
      if (!Array.isArray(reason) || reason.length === 0) {
        return res.error(400, "Reason array required when status is false");
      }

      // Mark specific documents as false based on reasons
      reason.forEach(r => {
        switch (r.toLowerCase()) {
          case "vehicle":
          case "vehicledetails":
            driverData.isadminVerified = false;

            driverData.isvehicleVerified = false;
            break;
          case "license":
            driverData.isadminVerified = false;

            driverData.islicenseVerified = false;
            break;
          case "bank":
            driverData.isadminVerified = false;

            driverData.isbankVerified = false;
            break;
          case "admin":
            driverData.isadminVerified = false;
            driverData.isadminVerified = false;
            break;
        }
      });

      // If any doc unverification → also set adminVerified false
      driverData.isadminVerified = false;
    }

    await driverData.save();

    const msg = status
      ? "All documents verified and account approved successfully."
      : "Selected documents have been unverified successfully.";

    return res.success(msg, driverData);
  } catch (err) {
    console.log(err);
    next(err);
  }
};



module.exports.GetDriverTripSTate = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { driverId } = req?.query
    if (!driverId) return res.error(400, "driverId is required")
    const stateData = await Queries.GetDriverRideStats(Model.Order, driverId)
    if (!stateData) return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, stateData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}