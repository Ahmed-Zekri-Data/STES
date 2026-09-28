const mongoose = require('mongoose');

// Named sequences, e.g. "invoice-2026" for that year's invoice numbers.
// Incremented atomically ($inc), so two requests never get the same value.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
}, { versionKey: false });

module.exports = mongoose.model('Counter', counterSchema);
