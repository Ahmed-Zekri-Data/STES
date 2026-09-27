const mongoose = require('mongoose');

// A discount code customers type at checkout. Created in Admin → Promo codes.
const promoCodeSchema = new mongoose.Schema({
  // Stored in capitals; customers may type it in any case
  code: {
    type: String,
    required: [true, 'Code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9_-]{3,30}$/, 'Code must be 3 to 30 letters, digits, - or _']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  // 'percent': value % of the products; 'fixed': value TND off
  type: {
    type: String,
    enum: ['percent', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: [0.001, 'Value must be positive']
  },
  // Products total (TTC) needed for the code to apply
  minOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  // Cap for percentage codes (null: no cap)
  maxDiscount: {
    type: Number,
    default: null,
    min: 0
  },
  startsAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  // How many orders may use it (null: unlimited)
  usageLimit: {
    type: Number,
    default: null,
    min: 1
  },
  // Orders currently using it; a cancelled or deleted order gives its use back
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

promoCodeSchema.path('value').validate(function (value) {
  return this.type !== 'percent' || value <= 100;
}, 'A percentage cannot exceed 100');

module.exports = mongoose.model('PromoCode', promoCodeSchema);
