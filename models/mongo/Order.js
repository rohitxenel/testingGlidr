const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "driver", index: true },
  email: String,
  phone: Number,
  name: String,
  pickupLocation: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true },
  },

  dropLocation: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true },
  },
  vehicleType: { type: String, required: true },
  rideType: {
    type: String,
    enum: ["Now", "Schedule"],
    default: "Now",
    required: true,

  },
  bookingType: {
    type: String,
    enum: ["Ride", "Bus", "PoolRide"],
    default: "Ride",
    required: true,
  },

  isSharedRide: { type: Boolean, default: false },
  poolRideId: { type: String, index: true }, // shared by all users in this pool
  seatCount: { type: Number, default: 1 },
  travelDate: Date,
  travelTime: String,
  // scheduleType: {
  //   type: String,
  //   enum: ["OneTime" , "Daily" , "Weekly" , "Monthly"],
  // },

  status: {
    type: String,
    enum: ["Pending", "Accepted", "Arrived", "InProgress", "Completed", "Cancelled", "CANCELLED", "Refund"],
    default: "Pending",
  },
  cancelreasonId: { type: mongoose.Schema.Types.ObjectId, ref: "admin", index: true },
  cancelby: { type: String, enum: ["USER", "DRIVER"] },
  fareDetails: {
    baseFare: { type: Number },
    cancelFare: { type: Number },
    distanceFare: { type: Number },
    timeFare: { type: Number },
    subtotal: { type: Number },
    surge: { type: Number },
    tollFees: { type: Number, default: 0 },
    platformFee: { type: Number },
    platformFeePercentage: { type: Number },
    totalFare: { type: Number },
    driverGets: { type: Number },
    distanceKm: { type: Number },
    distanceMiles: { type: Number },
    timeMin: { type: Number },
  },
  payment: {
    method: { type: String, enum: ["CASH", "ONLINE"] },
    amount: { type: Number },
    isPaid: { type: Boolean, default: false },
    paymentMethodId: { type: String },
    paymentDetails: Object
  },
  xtracoin: Number,
  rideotp: { type: Number },
  notes: { type: String },
  userreview: {
    comment: { type: String },
    customerBehavior: { type: Number, max: 5 },
    waitingTime: { type: Number, max: 5 },
    hygiene: { type: Number, max: 5 },
    generosity: { type: Number, max: 5 },
  },
  driverreview: {
    comment: { type: String },
    driverBehavior: { type: Number, max: 5 },
    drivingSkill: { type: Number, max: 5 },
    security: { type: Number, max: 5 },
    hygiene: { type: Number, max: 5 },
  },
  busDriverInfo: {
    contact: Number,
    BusNumber: String,
    driverName: String,
    SeatNo: Number
  },
  invoice: String,
  paymentMethodId: String,
},
  {
    strict: "throw",
    timestamps: true,
  }
);

// Flutter may send CANCELLED — normalize before enum validation
orderSchema.pre("validate", function (next) {
  if (this.status === "CANCELLED") {
    this.set("status", "Cancelled");
  }
  next();
});

// Reload schema on nodemon restart (avoids stale enum cache)
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

module.exports = mongoose.model("Order", orderSchema);
