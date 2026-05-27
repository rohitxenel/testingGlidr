const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const constants = require("../../common/constants");
const ObjectId = mongoose.Types.ObjectId;
const functions = require("../../common/functions");

const DocSchema = new Schema(
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
    type: { type: String, enum: ["google", "phone"], default: "phone" },
    birthDate: { type: Date },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    accessToken: String,
    fcmToken: String,
    paymentmode: { type: String, enum: ["CASH", "ONLINE"], default: "CASH" },
    duePay: { type: Number, default: 0 },
    xtracoin: { type: Number, default: 0 },
    WalletBalance: { type: Number, default: 0 },
    profileImage: String,

    popularPlaces: [
      {
        formattedAddress: { type: String, required: true },
        count: { type: Number, default: 1 },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    ],
    stripe_customer_id: { type: String },
    payment_setup_completed: { type: Boolean, default: false },
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








DocSchema.methods.setPassword = function (password, callback) {
  const promise = new Promise((resolve, reject) => {
    if (!password) reject(new Error("Missing Password"));

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) reject(err);
      this.password = hash;
      resolve(this);
    });
  });

  if (typeof callback !== "function") return promise;
  promise
    .then((result) => callback(null, result))
    .catch((err) => callback(err));
};

DocSchema.methods.authenticate = function (password, callback) {
  const promise = new Promise((resolve, reject) => {
    if (!password) reject(new Error("MISSING_PASSWORD"));

    bcrypt.compare(password, this.password, (error, result) => {
      if (!result) reject(new Error("INVALID_PASSWORD"));
      resolve(this);
    });
  });

  if (typeof callback !== "function") return promise;
  promise
    .then((result) => callback(null, result))
    .catch((err) => callback(err));
};


module.exports = mongoose.model("Users", DocSchema);

