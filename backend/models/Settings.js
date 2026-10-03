const mongoose = require('mongoose');

// A product chosen in these settings: its id, or "<id>:<version code>" for
// one of its versions (see utils/productOffer.js). Older ones are ObjectIds.
const ProductRef = { type: String };

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
      pump: ProductRef,
      filter: ProductRef,
      robot: ProductRef,
      lights: ProductRef,
      ring: ProductRef
    },
    // "My water has a problem": the products that solve each one
    problems: {
      green: [ProductRef],
      cloudy: [ProductRef],
      dirty: [ProductRef],
      cold: [ProductRef]
    },
    // Configurator: pump and filter for each pool size, the LED light, options
    sizes: [{
      _id: false,
      label: String,
      pump: ProductRef,
      filter: ProductRef
    }],
    lights: ProductRef,
    options: [ProductRef],
    // Seasonal packs: a product sold as a pack, and what it contains
    packs: [{
      _id: false,
      product: ProductRef,
      season: String,
      includes: [ProductRef]
    }],
    showMap: Boolean, // the map of orders by governorate
    partnerBadge: String // e.g. "Partenaire agréé AstralPool"; empty hides it
  },
  // "Construire ma piscine" (Admin → Settings → Pool builder)
  builder: {
    // The products visitors can place around their pool, with how each is drawn
    equipment: [{
      _id: false,
      product: ProductRef,
      kind: String // pump, filter, heat, light, robot, ladder, shower, cover, other
    }],
    // Construction price per m² of water (TND); 0 hides the estimate
    pricePerM2Min: Number,
    pricePerM2Max: Number
  },
  // Admin → Settings → Marketing: audience measurement (loaded only for
  // visitors who accept cookies), the shop's social pages, and where
  // customers leave a Google review
  marketing: {
    gaMeasurementId: String, // Google Analytics 4, "G-XXXXXXXXXX"
    metaPixelId: String, // Facebook / Instagram ads
    facebookUrl: String,
    instagramUrl: String,
    tiktokUrl: String,
    googleReviewUrl: String
  },
  // Pool care reminders (Admin → Settings → Reminders). Each one is kept by
  // its key (see config/maintenanceCalendar.js)
  reminders: {
    calendar: [{
      _id: false,
      key: String,
      month: Number, // 1–12
      day: Number, // 1–28
      title: String,
      message: String,
      products: [ProductRef],
      active: Boolean
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
