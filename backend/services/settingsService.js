const Settings = require('../models/Settings');
const { LOW_STOCK_THRESHOLD } = require('../config/inventory');

// Used until an admin saves other values in Admin → Settings
const DEFAULTS = {
  contact: {
    phone: '+216 12 345 678',
    whatsapp: '+216 12 345 678',
    email: 'info@stes.tn',
    address: 'Tunis, Tunisie'
  },
  delivery: {
    freeDeliveryOver: 200,
    baseCost: 7,
    cashOnDeliveryFee: 5
  },
  lowStockThreshold: LOW_STOCK_THRESHOLD
};

const pick = (saved, defaults) => Object.fromEntries(
  Object.keys(defaults).map(key => [key, saved?.[key] ?? defaults[key]])
);

// The shop settings, with defaults for anything never saved
const getSettings = async () => {
  const saved = await Settings.findOne({ key: 'shop' }).lean();
  return {
    contact: pick(saved?.contact, DEFAULTS.contact),
    delivery: pick(saved?.delivery, DEFAULTS.delivery),
    lowStockThreshold: saved?.lowStockThreshold ?? DEFAULTS.lowStockThreshold,
    updatedAt: saved?.updatedAt || null
  };
};

// Saves the given sections; anything not given keeps its value
const updateSettings = async ({ contact, delivery, lowStockThreshold }) => {
  const set = {};
  for (const [section, values] of Object.entries({ contact, delivery })) {
    for (const [key, value] of Object.entries(values || {})) {
      if (key in DEFAULTS[section]) set[`${section}.${key}`] = value;
    }
  }
  if (lowStockThreshold !== undefined) set.lowStockThreshold = lowStockThreshold;
  if (!Object.keys(set).length) return getSettings();

  await Settings.updateOne({ key: 'shop' }, { $set: set }, { upsert: true });
  return getSettings();
};

// What the shop pages show: contact details and delivery prices
const publicSettings = async () => {
  const { contact, delivery } = await getSettings();
  return { contact, delivery };
};

module.exports = { DEFAULTS, getSettings, updateSettings, publicSettings };
