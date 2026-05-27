// models/Role.js
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  rideId: { type: String, required: true, unique: true }, 
  userId: { type: String, required: true , index:true},
  type:{ type: String, enum: ["OPEN", "CLOSE"], default: "OPEN" }
},
{
    strict: "throw",
    timestamps: true,
  }
);

module.exports = mongoose.model('refund', refundSchema);
