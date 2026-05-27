// models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "FINANCE_ADMIN"
  permissions: [String], // e.g., ['VIEW_FINANCE', 'VIEW_TRANSACTIONS']
});

module.exports = mongoose.model('role', roleSchema);
