const mongoose = require('mongoose');

// Shop settings changed in Admin → Settings. There is one document (key
// "shop"); missing values fall back to the defaults in settingsService.
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'shop' },
  contact: {
    phone: String,
    whatsapp: String,
    email: String,
    address: String
  },
  delivery: {
    freeDeliveryOver: Number, // TND; orders above this ship free
    baseCost: Number, // TND, before the governorate factor
    cashOnDeliveryFee: Number // TND
  },
  lowStockThreshold: Number // products at or below this many units are "low"
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
