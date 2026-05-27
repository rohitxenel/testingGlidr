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




module.exports.SignUp = async (req, res, next) => {
  try {
    const { name, email, password, superadmin } = req.body || {};

    if (!name || !email || !password) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED);
    }

    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.EMAIL_FORMATE);
    }

    if (password.length < 6) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.PASSWORD_CHECK);
    }

    const hashedPassword = await setPassword(password);
    const formattedName = name.toLowerCase().replace(/\s+/g, " ").trim();

    const existingUser = await Queries.findOne(Model.Admin, { email });

    if (existingUser) {
      return res.error(409, common.constants.RESPONSE_MESSAGES.SIGNUP_ALREADY);
    }

    const newUser = {
      name: formattedName,
      email,
      password: hashedPassword,
      type: superadmin === true ? "SUPERADMIN" : "ADMIN",
      isEmailVerified: true, // ✅ auto verified
    };

    const admin = await Queries.insertOne(Model.Admin, newUser);

    const token = Auth.getToken({
      id: admin._id,
      email: admin.email,
    });

    admin.Token = token;
    await admin.save();

    return res.success(common.constants.RESPONSE_MESSAGES.SIGNUP_SUCCESS, {
      token,
      email: admin.email,
    });

  } catch (error) {
    next(error);
  }
};




module.exports.Login = async (req, res, next) => {
  try {
    const { email, password } = req?.body
    console.log({ email, password })
    if (!email || !password) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED)
    const user = await Queries.findOne(Model.Admin, { email })
    if (!user) return res.error(404, common.constants.RESPONSE_MESSAGES.SIGNUP_1)

    if (user.isBlocked) return res.error(403, common.constants.RESPONSE_MESSAGES.BLOCK);
    if (user.isDeleted) return res.error(403, common.constants.RESPONSE_MESSAGES.DELETE);

    if (!user.isEmailVerified) return res.error(403,);

    const isMatch = await authenticatePassword(password, user?.password);
    const Token = Auth.getToken({ id: user?._id, email: user?.email, });

    if (!isMatch) return res.error(401, common.constants.RESPONSE_MESSAGES.WRONG_PASSWORD);
    user.Token = Token
    await user.save()
    return res.success(common.constants.RESPONSE_MESSAGES.LOGIN, { Token , id:user._id , email})
  } catch (err) {
    console.log(err)
    next(err)
  }
}


module.exports.Logout = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const user = await Queries.findOne(Model.Admin, { _id: auth?._id })
    if (!user) return res.error(404, common.constants.RESPONSE_MESSAGES.SIGNUP_1)

    user.Token = ''
    await user.save()
    return res.success("Logout Successfully",)
  } catch (err) {
    console.log(err)
    next(err)
  }
}


module.exports.ForgatePassword = async (req, res, next) => {
  try {
    const { email } = req?.body
    if (!email) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED)
    const user = await Queries.findOne(Model.Admin, { email })
    if (!user) return res.error(404, common.constants.RESPONSE_MESSAGES.SIGNUP_1)

    if (user.isBlocked) return res.error(403, common.constants.RESPONSE_MESSAGES.BLOCK);
    if (user.isDeleted) return res.error(403, common.constants.RESPONSE_MESSAGES.DELETE);
    const otp = await functions.generateNumber(6)
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await service.Email.sendAdminForgotPasswordOtpEmail(user?.email, "Reset Your Admin Password", user?.name, otp)
    user.OTP = otp;
    user.OTPExpiresAt = otpExpiry
    await user.save()
    return res.success(common.constants.RESPONSE_MESSAGES.RESET_OTP)
  } catch (err) {
    console.log(err)
    next(err)
  }
}




module.exports.VerifyForgotPasswordOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED);

    const user = await Queries.findOne(Model.Admin, { email });
    if (!user) return res.error(404, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND);

    if (!user.OTP || !user.OTPExpiresAt || new Date() > new Date(user.OTPExpiresAt)) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.OTP_EXPIRE);
    }

    if (Number(user.OTP) !== Number(otp)) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.INVALID_OTP);
    }

    user.isEmailVerified = true;
    user.OTP = null;
    user.OTPExpiresAt = null;
    await user.save();

    return res.success(common.constants.RESPONSE_MESSAGES.SETNEWPASSWORD);
  } catch (error) {
    next(error);
  }
};



module.exports.SetNewPassword = async (req, res, next) => {

  try {
    const { newpassword, email } = req?.body
    if (!newpassword || !email) return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED)
    console.log({ newpassword })
    const user = await Queries.findOne(Model.Admin, { email })

    const isSame = await authenticatePassword(newpassword, user?.password);
    if (isSame) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.SAME_PASSWORD);
    }
    const Password = await setPassword(newpassword)
    user.password = Password
    await user.save()
    return res.success(common.constants.RESPONSE_MESSAGES.LOGIN_NEW_PASSWORD)
  } catch (err) {
    next(err)
  }
}



module.exports.createOrUpdateRole = async (req, res, next) => {
  try {
    const { name, permissions } = req.body;
    if (!name || !Array.isArray(permissions)) {
      return res.error(400, "Role name and permissions array are required");
    }

    let role = await Queries.findOne(Model.Role, { name });

    if (role) {
      role.permissions = permissions;
      await role.save();
      return res.success("Role permissions updated", role);
    } else {
      role = await Queries.insertOne(Model.Role, { name, permissions });
      return res.success("Role created successfully", role);
    }
  } catch (error) {
    next(error);
  }
};



module.exports.assignRoleToAdmin = async (req, res, next) => {
  try {
    const { adminId, roleId } = req.body;

    if (!adminId || !roleId) {
      return res.error(400, "Admin ID and role Id are required");
    }

    const role = await Queries.findOne(Model.Role, { _id: roleId });
    if (!role) return res.error(404, "Role not found");

    const admin = await Queries.findOne(Model.Admin, { _id: adminId });
    if (!admin) return res.error(404, "Admin not found");

    admin.role = role._id;
    await admin.save();

    return res.success("Role assigned to admin successfully", admin);
  } catch (error) {
    next(error);
  }
};



module.exports.GetAllAdmin = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const projection = ""
    filter.type = "ADMIN"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Admin,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (error) {
    next(error);
  }
};





const FIELDS = ['baseprice', 'timeprice', 'distaceprice', 'plateformfees', 'cancelprice'];
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports.AddVehicleType = async (req, res, next) => {
  try {
    let name = (req.body?.VehicalType || '').trim();
    if (!name) return res.error(400, 'vehicaltype is required');
    name = name.toUpperCase();
    const values = {};
    for (const k of FIELDS) {
      const n = Number(req.body?.[k]);
      if (!Number.isFinite(n)) return res.error(400, `${k} must be a number`);
      values[k] = n;
    }
    await Redisquery.DeleteItem("BOOKINGPRICE");

    const exists = await Model.Admin.findOne({
      type: 'BOOKINGPRICE',
      VehicalType: new RegExp(`^${esc(name)}$`, 'i'),
    });
    if (exists) return res.error(409, 'vehicle already exist');

    const doc = await Model.Admin.create({ type: 'BOOKINGPRICE', VehicalType: name, ...values });
    return res.success('Vehicle added successfully', { id: doc._id });
  } catch (e) {
    next(e);
  }
};

module.exports.EditVehicleType = async (req, res, next) => {
  try {
    const id = req.body?.id;
    if (!id) return res.error(400, 'id is required');

    const update = {};
    let newName = (req.body?.vehicaltype || '').trim();

    if (newName) {
      // ✅ Force uppercase
      newName = newName.toUpperCase();
      update.VehicalType = newName;
    }
    await Redisquery.DeleteItem("BOOKINGPRICE");

    for (const k of FIELDS) {
      if (req.body?.[k] !== undefined) {
        const n = Number(req.body?.[k]);
        if (!Number.isFinite(n)) return res.error(400, `${k} must be a number`);
        update[k] = n;
      }
    }

    if (Object.keys(update).length === 0) return res.error(400, 'nothing to update');

    if (update.VehicalType) {
      const dup = await Model.Admin.findOne({
        _id: { $ne: id },
        type: 'BOOKINGPRICE',
        VehicalType: new RegExp(`^${esc(update.VehicalType)}$`, 'i'),
      });
      if (dup) return res.error(409, 'vehicle already exist');
    }

    const r = await Model.Admin.updateOne(
      { _id: id, type: 'BOOKINGPRICE' },
      { $set: update }
    );

    if (!r.matchedCount) return res.error(404, 'vehicle not found');

    return res.success('Vehicle updated successfully');
  } catch (e) {
    next(e);
  }
};




module.exports.GetAllVehicle = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const projection = "type VehicalType baseprice timeprice cancelprice distaceprice plateformfees status updatedAt"
    filter.type = "BOOKINGPRICE"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Admin,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (error) {
    next(error);
  }
};


module.exports.GetAllTicket = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const projection = null
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Ticket,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (error) {
    next(error);
  }
};

module.exports.GetTicketById = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id } = req?.query
    if (!id) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Ticket, { _id: id })
    if (!user) return res.error(400, common.constants.RESPONSE_MESSAGES.USER_NOT_FOUND)
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports.SendReply = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id , email , subject , message } = req?.body
    if (!id || !email || !subject || !message) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Ticket, { _id: id })
    if (!user) return res.error(400, "Ticket Not Found")
    if (user.Status === "CLOSE") return res.error(400, "Ticket already Closed")
    user.reply = message
    user.Status = "CLOSE"
    await user.save()
    await service.Email.sendReplyEmail(email, subject, message , id)
    
    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports.ChangeTicketStatus = async (req, res, next) => {
  try {
    const auth = req.admin;

    if (!auth || !auth._id) {
      return res.error(401, common.constants.RESPONSE_MESSAGES.UNAUTHORIZED);
    }
    const { id , status} = req?.body
    console.log({ id , status})
    if (!id || !status) return res.error(400, common.constants.RESPONSE_MESSAGES.MISSING_ID)
    const user = await Queries.findOne(Model.Ticket, { _id: id })
    if (!user) return res.error(400, "Tickat Not Found")
    user.Status = status
    await user.save()
    return res.success("Status Change Successfully", user);
  } catch (err) {
    console.log(err)
    next(err)
  }
}


module.exports.AddAccountType = async (req, res, next) => {
  try {
    const { bankaccountType } = req.body || {};
    console.log({ bankaccountType })
    if (!bankaccountType) {
      return res.error(400, "`bankaccountType` is required.");
    }

    const existing = await Queries.findOne(Model.Admin, { bankaccountType, type: "BANKTYPE" });

    if (existing) {
      return res.error(409, "This bank account type already exists.");
    }

    const newBankType = await Queries.insertOne(Model.Admin, {
      bankaccountType,
      type: "BANKTYPE",
    });

    return res.success("Bank account type added successfully.", newBankType);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};

module.exports.EditBankAccountType = async (req, res, next) => {
  try {
    const { bankaccountType, id } = req?.body || {};
    if (!bankaccountType || !id) {
      return res.error(400, "bankaccountType and id are required.");
    }

    const existing = await Queries.findOne(Model.Admin, { _id: id, type: "BANKTYPE" });

    if (!existing) {
      return res.error(409, "This bank account type are Not exists.");
    }

    existing.bankaccountType = bankaccountType
    await existing.save()

    return res.success("Bank account type edit successfully.", existing);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};



module.exports.DeleteBankAccountType = async (req, res, next) => {
  try {
    const { id } = req?.body || {};
    if (!id) {
      return res.error(400, "Id is required.");
    }

    const existing = await Queries.findOne(Model.Admin, { _id: id });

    if (!existing) {
      return res.error(409, "This bank account Not found.");
    }
    await Redisquery.DeleteItem("BOOKINGPRICE");

    const Delete = await Queries.deleteOne(Model.Admin, { _id: id });
    console.log({ Delete })


    return res.success("Bank account type Delete successfully.", Delete);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};

module.exports.ChangeStatusAccountType = async (req, res, next) => {
  try {
    const { id, status } = req?.body || {};
    console.log({ id, status })
    if (!id) {
      return res.error(400, "`id` is required.");
    }
    if (status === undefined) {
      return res.error(400, "Status is required.");
    }
    const existing = await Queries.findOne(Model.Admin, { _id: id });

    if (!existing) {
      return res.error(409, "This bank account Not found.");
    }
    existing.status = status
    await existing.save()
    return res.success("Bank account type Status Change successfully.");
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};
module.exports.GetAllBankAccount = async (req, res, next) => {

  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 100);
    const projection = "bankaccountType createdAt status"
    filter.type = "BANKTYPE"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Admin,
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
    next(err)
  }

}


module.exports.GetAllVehicleType = async (req, res, next) => {
  try {

    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const projection = "VehicalType"
    filter.type = "BOOKINGPRICE"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Admin,
      filter,
      page,
      limit,
      projection
    );

    if (!orderData || !orderData.data || orderData.data.length === 0) {
      return res.success(common.constants.RESPONSE_MESSAGES.DATA_NOT_FOUND, { data: [], page, limit });
    }

    return res.success(common.constants.RESPONSE_MESSAGES.DATA_GET, orderData);
  } catch (error) {
    next(error);
  }
};



module.exports.DashboardState = async (req, res, next) => {
  try {
    const { scope } = req?.query || {};
    if (!scope) {
      return res.error(400, "Select atleast One Filter");
    }

    const Data = await Queries.GetDashboardStats(Model.Order, scope);

    if (!Data) {
      return res.error(409, "This bank account Not found.");
    }

    return res.success("DashBoard Get  successfully.", Data);
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};


module.exports.recentOrders = async (req, res, next) => {
  try {
    const { limit } = req?.query || {};
    if (!limit) {
      return res.error(400, "Select atleast One Filter");
    }
    console.log({ limit })
    const filter = {};
    const page = 1
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Order,
      filter,
      page,
      limit,
      projection = "",
      [
        { path: "userId", select: "name  phone" },
        { path: "driverId", select: "phone name" }
      ]
    );

    return res.success("DashBoard Get  successfully.", orderData);
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};




module.exports.Top_5_Rider = async (req, res, next) => {
  try {
   
    const orderData = await Queries.GetTopRiders(Model.Order);
    console.log({orderData})
    if(!orderData) return res.error(400 , "Data Not Found")
    return res.success("DashBoard Get  successfully.", orderData);
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};



module.exports.WeeklyRiderPerformace = async (req, res, next) => {
  try {
   
    const orderData = await Queries.GetLast7DaysPerformance(Model.Order);
    console.log({orderData})
    if(!orderData) return res.error(400 , "Data Not Found")
    return res.success("DashBoard Get  successfully.", orderData);
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};




module.exports.AddCancelReason = async (req, res, next) => {
  try {
    const { reason , type } = req.body || {};
    if (!reason || !type) {
      return res.error(400, "reason and type are required");
    }

    const existing = await Queries.findOne(Model.Admin, { cancelreason: reason, type });

    if (existing) {
      return res.error(409, `This reason  already exists for ${type}.`);
    }

    const DatakType = await Queries.insertOne(Model.Admin, {
      cancelreason: reason,
      type,
      status: true,
    });
    const { invalidateCancelReasonCache } = require("../../common/cancelReasons");
    await invalidateCancelReasonCache(type);

    return res.success("Cancel Reason added successfully.", DatakType);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};

module.exports.EditCancelReason = async (req, res, next) => {
  try {
    const { reason, id , type} = req?.body || {};
    if (!reason || !id) {
      return res.error(400, "Reason and id are required.");
    }

    const existing = await Queries.findOne(Model.Admin, { _id: id});

    if (!existing) {
      return res.error(409, "This Cancel reason are Not exists.");
    }

    existing.cancelreason = reason
    await existing.save()
    const { invalidateCancelReasonCache } = require("../../common/cancelReasons");
    await invalidateCancelReasonCache(type || existing.type);

    return res.success("Bank account type edit successfully.", existing);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};



module.exports.DeleteCancelReason = async (req, res, next) => {
  try {
    const { id , type} = req?.body || {};
    if (!id) {
      return res.error(400, "Id is required.");
    }

    const existing = await Queries.findOne(Model.Admin, { _id: id });

    if (!existing) {
      return res.error(409, "This Cancel Reason Not found.");
    }
   

    const Delete = await Queries.deleteOne(Model.Admin, { _id: id });
    const { invalidateCancelReasonCache } = require("../../common/cancelReasons");
    await invalidateCancelReasonCache(type || existing.type);


    return res.success("Cancel Ride Delete successfully.", Delete);
  } catch (err) {
    console.error("AddAccountType Error:", err);
    next(err);
  }
};

module.exports.ChangeStatusCancelReason = async (req, res, next) => {
  try {
    const { id, status ,type} = req?.body || {};
    console.log({ id, status })
    if (!id) {
      return res.error(400, "`id` is required.");
    }
    if (status === undefined) {
      return res.error(400, "Status is required.");
    }
    const existing = await Queries.findOne(Model.Admin, { _id: id });

    if (!existing) {
      return res.error(409, "This Cancel Reason Not found.");
    }
    const { invalidateCancelReasonCache } = require("../../common/cancelReasons");
    await invalidateCancelReasonCache(type || existing.type);

    existing.status = status
    await existing.save()
    return res.success("Cancel Reason  Status Change successfully.");
  } catch (err) {
    console.error("AccountType Error:", err);
    next(err);
  }
};

/** GET /admin/get-cancel-reason?type=USERCANCEL | DRIVERCANCEL */
module.exports.GetCancelReasons = async (req, res, next) => {
  try {
    const type = String(req.query.type || "USERCANCEL").toUpperCase();
    const { getCancelReasonsByType, ALLOWED_TYPES } = require("../../common/cancelReasons");

    if (!ALLOWED_TYPES.includes(type)) {
      return res.error(400, "Query type must be USERCANCEL or DRIVERCANCEL");
    }

    const cancelData = await getCancelReasonsByType(type, { useCache: false });
    if (!cancelData) {
      return res.success("No cancel reasons found", []);
    }

    return res.success("Cancel reasons fetched successfully", cancelData);
  } catch (err) {
    console.error("GetCancelReasons Error:", err);
    next(err);
  }
};

module.exports.GetAllBankAccount = async (req, res, next) => {

  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 100);
    const projection = "bankaccountType createdAt status"
    filter.type = "BANKTYPE"
    const orderData = await Queries.findAllWithFilterAndPagination_New(
      Model.Admin,
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
    next(err)
  }

}



