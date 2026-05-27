const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const constants = require("../../common/constants");
const ObjectId = mongoose.Types.ObjectId;
const functions = require("../../common/functions");

const driverSchema = new Schema(
  {
    name: { type: String, default: "Guest" },
    password: { type: String },
    phone: { type: String, index: true },
    country: String,
    currency: String,
    email: { type: String, index: true },
    emailOtp: { type: Number },
    phoneOtpExpiry: { type: Number },
    emailOtpExpiry: { type: Number },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    birthDate: { type: Date },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    type: { type: String, enum: ["google", "phone"], default: "phone" },
    accessToken: String,
    fcmToken: String,
    status: { type: String, enum: ["ONLINE", "ONRIDE", "OFFLINE"], default: "OFFLINE" },
    Wallet: { type: Number, default: 0 },
    DueWallet: { type: Number, default: 0 },
    
    driverPhoto: { type: String, default: "" },
    drivinglicense: String,
    criminalRecord:{ type: Boolean, default: false },
    passport:{ type: Boolean, default: false },
    homeAddress: String,
    referenceNameOne: String,
    referenceMobileOne: Number,
    referenceNameTwo: String,
    referenceMobileTwo: Number,
    nationalId: String,
    Bank: String,
    VehicalType: {
      type: String,
    },
    VehicalDetails: {
      brand: String,
      model: String,
      year: Number,
      color: String,
      plateNumber: String,
      seatingCapacity: Number,
      electric: String
    },
    isvehicleDetails: { type: Boolean, default: false },
    isvehicleVerified: { type: Boolean, default: false },
    bankDetails: {
      BeneficiaryName: String,
      bankAccount: String,
      bankName: String,
      city: String,
      branch: String,
      AccountType: String,
      effectiveDate: Date,
      Code: String
    },
    isaddbank: { type: Boolean, default: false },
    isbankVerified: { type: Boolean, default: false },
    isaddlicense: { type: Boolean, default: false },
    islicenseVerified: { type: Boolean, default: false },
    isadminVerified: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0],
      },
    },
  },
  {
    strict: "throw", // Add this to enable strict type validation
    timestamps: true,
  }
);








module.exports = mongoose.model("driver", driverSchema);

