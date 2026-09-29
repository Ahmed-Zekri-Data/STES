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
  // Shown to customers who pay by bank transfer
  bank: {
    bankName: String,
    beneficiary: String,
    rib: String
  },
  delivery: {
    freeDeliveryOver: Number, // TND; orders above this ship free
    baseCost: Number, // TND, before the governorate factor
    cashOnDeliveryFee: Number // TND
  },
  // Printed on invoices; stampDuty (TND) is added to every order
  invoice: {
    companyName: String,
    taxId: String, // matricule fiscal
    tradeRegister: String, // registre de commerce / RNE
    address: String,
    stampDuty: Number
  },
  lowStockThreshold: Number, // products at or below this many units are "low"
  // Home page (Admin → Settings → Home page): which products appear where.
  // Products that no longer exist are skipped when the page is shown.
  showcase: {
    // The 3D objects visitors can buy
    hotspots: {
      pump: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      filter: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      robot: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      lights: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      ring: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    },
    // "My water has a problem": the products that solve each one
    problems: {
      green: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      cloudy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      dirty: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      cold: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
    },
    // Configurator: pump and filter for each pool size, the LED light, options
    sizes: [{
      _id: false,
      label: String,
      pump: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      filter: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    }],
    lights: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Seasonal packs: a product sold as a pack, and what it contains
    packs: [{
      _id: false,
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      season: String,
      includes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
    }],
    showMap: Boolean, // the map of orders by governorate
    partnerBadge: String // e.g. "Partenaire agréé AstralPool"; empty hides it
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
