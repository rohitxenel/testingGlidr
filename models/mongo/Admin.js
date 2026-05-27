const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const AdminSchema = new Schema(
  {
    email: { type: String, index:true},
    password: String,
    name:String,
    isEmailVerified: { type: Boolean, default: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'role' },
    type:{ type: String,enum:["BOOKINGPRICE" , "DRIVER" , "ADMIN" , "SUPERADMIN" , "BANKTYPE" , "USERCANCEL" , "DRIVERCANCEL"] , index:true },
    OTP:{type:Number},
    OTPExpiresAt: { type: Date },
    isBlocked: { type: Boolean ,default: false},
    isDeleted: { type: Boolean ,default: false},
    cancelreason:String,
    Token:String,
    VehicalType:String,
    baseprice:Number,
    timeprice:Number,
    cancelprice:Number,
    distaceprice:Number,
    plateformfees:Number,
    status:{type:Boolean , default:true},
    bankaccountType:String,
  },
  {
    strict: "throw", // Add this to enable strict type validation
    timestamps: true,
  }
);








module.exports = mongoose.model("admin", AdminSchema);

