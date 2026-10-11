const mongoose = require('mongoose');

// Addresses that asked for no more marketing emails (abandoned cart,
// quote follow-up, review request, replenishment), from the link at the
// bottom of each one. Order, invoice and account emails still go out.
const emailOptOutSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailOptOut', emailOptOutSchema);
