const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
  driverId: {
    type: mongoose.Types.ObjectId,
    ref: 'driver',
    required: true,
    index: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true,
  },
  sessions: [
    {
      loginTime: { type: Date, required: true },
      logoutTime: { type: Date },
    },
  ],
  totalOnlineTime: {
    type: Number,
    default: 0, // in seconds
  },
}, {
  timestamps: true,
});

sessionSchema.index({ driverId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DriverSession', sessionSchema);
