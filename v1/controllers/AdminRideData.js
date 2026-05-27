const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const common = require('../../common')
const service = require('../../services')





module.exports.GetAllRide = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = "status bookingType rideType fareDetails.totalFare payment.method"
    filter.bookingType = { $ne: "Bus" };
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection,
      [
        { path: "userId", select: "name  phone" },
        { path: "driverId", select: "phone name" }
      ]
    );
    console.log({ orderData })
    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.getRidebyId = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id } = req?.query
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Order, { _id: id }, {}, [
      { path: "userId", select: "name  phone email country currency" },
      { path: "driverId", select: "phone name email country currency VehicalDetails" }
    ])
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}


module.exports.GetAllBusRide = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const projection = "status bookingType rideType fareDetails.totalFare payment.method"
    filter.bookingType = "Bus"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection,
      [
        { path: "userId", select: "name  phone" },
        { path: "driverId", select: "phone name" }
      ]
    );
    console.log({ orderData })
    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (err) {
    console.log(err)
    next(err)
  }
}



module.exports.AssignBusDriver = async (req, res, next) => {
  try {
    const auth = req?.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { OrderId, BusNumber, contact, driverName, SeatNo } = req?.body
    if (!OrderId || !BusNumber || !contact || !driverName || !SeatNo) return res.error(400, "All Failed are required")
    const BusbookData = await Queries.findOne(Model.Order, { _id: OrderId })
    if (!BusbookData) return res.error(400, "Booking Not found")
    console.log({ BusbookData })
    if (BusbookData.status === "Cancelled") return res.error(400, "Bus Booking cancelled")
    if (BusbookData.status === "Completed") return res.error(400, "Bus Booking already Completed")
    const Data = {
      contact: contact,
      BusNumber: BusNumber,
      driverName: driverName,
      SeatNo: SeatNo
    }
    await service.Email.sendBusAssignedEmail(
      BusbookData.email,
      "🚌 Bus Assigned for Your Glidr Booking",
      {
        name: BusbookData.name,
        dateoftrevel: BusbookData.travelDate,
        deptime: BusbookData.travelTime,
        deplocation: BusbookData.pickupLocation.address,
        deslocation: BusbookData.dropLocation.address,
        busNumber: BusNumber,
        driverName: driverName,
        driverContact: contact,
      }
    );

    BusbookData.busDriverInfo = Data
    BusbookData.status = "Accepted"
    await BusbookData.save()

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, Data);
  } catch (err) {
    console.log(err)
    next(err)
  }
}

