const mongoose = require('mongoose');

// Someone who asked for pool care reminders on /entretien. Reminders go by
// email (sent by the shop each morning) and, when they gave a number, by
// WhatsApp (sent by an admin from Admin → Reminders). Unsubscribing deletes
// the record.
const maintenanceSubscriberSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true }, // +216…, for WhatsApp
  channels: {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false }
  },
  volume: { type: Number, min: 1, max: 2000 }, // m³ of water
  source: { type: String, enum: ['page', 'builder'], default: 'page' },
  // Reminders already sent: one per key, year and channel
  sent: [{
    _id: false,
    key: String,
    year: Number,
    channel: { type: String, enum: ['email', 'whatsapp'] },
    at: { type: Date, default: Date.now }
  }],
  consentAt: { type: Date, default: Date.now },
  ipAddress: String
}, {
  timestamps: true
});

module.exports = mongoose.model('MaintenanceSubscriber', maintenanceSubscriberSchema);
