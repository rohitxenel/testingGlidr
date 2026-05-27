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





module.exports.GetAllUser = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = "name phone country email isBlocked isDeleted"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.User,
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



module.exports.getUserbyId = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id } = req?.query
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.User, { _id: id })
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.BlockUserById = async (req, res, next) => {
  try {
    const auth = req.admin;
    if (!auth || !auth._id) return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);

    const { id, block, deleted } = req.body || {};
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID);

    const user = await Queries.findOne(Model.User, { _id: id });
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
    console.log(block)
    user.isBlocked = block;
    await user.save();
    if (user?.email) {
      const emailFn = block
        ? service.Email.sendAdminBlockedUserEmail
        : service.Email.sendAdminUnblockedUserEmail;

      await emailFn(
        user.email,
        block ? "Your Account Has Been Blocked" : "Welcome Back - Your Account is Unblocked",
        user.name,
        block ? "Violation of our platform policy" : undefined
      );
    }
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


module.exports.GetAllTripByUserId = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const { userId } = req?.query
    console.log({userId})
    if (!userId) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = ""
    filter.userId = userId
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection,
      [
        { path: "driverId", select: "name phone vehicleNo" }
      ]
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



module.exports.GetAllTrips = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = ""
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


module.exports.GetUserTripState = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { userId } = req?.query
    if(!userId) return res.error(400 , "UserId is required")
    const stateData = await Queries.GetUserRideStats(Model.Order , userId)
    if(!stateData) return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, stateData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}


