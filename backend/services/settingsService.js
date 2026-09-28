const Settings = require('../models/Settings');
const { LOW_STOCK_THRESHOLD } = require('../config/inventory');
const { formatRib, ibanOf } = require('../utils/rib');

// Used until an admin saves other values in Admin → Settings
const DEFAULTS = {
  contact: {
    phone: '+216 12 345 678',
    whatsapp: '+216 12 345 678',
    email: 'info@stes.tn',
    address: 'Tunis, Tunisie'
  },
  // Empty until the shop enters its account: bank transfer is not offered
  bank: {
    bankName: '',
    beneficiary: '',
    rib: ''
  },
  delivery: {
    freeDeliveryOver: 200,
    baseCost: 7,
    cashOnDeliveryFee: 5
  },
  // Legal details printed on invoices, and the stamp duty (timbre fiscal)
  // added to each order; 0 turns it off
  invoice: {
    companyName: '',
    taxId: '',
    tradeRegister: '',
    address: '',
    stampDuty: 1
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
    bank: pick(saved?.bank, DEFAULTS.bank),
    delivery: pick(saved?.delivery, DEFAULTS.delivery),
    invoice: pick(saved?.invoice, DEFAULTS.invoice),
    lowStockThreshold: saved?.lowStockThreshold ?? DEFAULTS.lowStockThreshold,
    updatedAt: saved?.updatedAt || null
  };
};

// Saves the given sections; anything not given keeps its value
const updateSettings = async ({ contact, bank, delivery, invoice, lowStockThreshold }) => {
  const set = {};
  for (const [section, values] of Object.entries({ contact, bank, delivery, invoice })) {
    for (const [key, value] of Object.entries(values || {})) {
      if (key in DEFAULTS[section]) set[`${section}.${key}`] = value;
    }
  }
  if (lowStockThreshold !== undefined) set.lowStockThreshold = lowStockThreshold;
  if (!Object.keys(set).length) return getSettings();

  await Settings.updateOne({ key: 'shop' }, { $set: set }, { upsert: true });
  return getSettings();
};

// The account customers pay into by bank transfer, or null while the shop
// has not entered one (bank transfer is then not offered)
const bankTransferDetails = (bank) => (bank?.rib && bank.beneficiary
  ? { bankName: bank.bankName, beneficiary: bank.beneficiary, rib: formatRib(bank.rib), iban: ibanOf(bank.rib) }
  : null);

// What the shop pages show: contact details, bank account, delivery prices
// and the stamp duty added to orders
const publicSettings = async () => {
  const { contact, bank, delivery, invoice } = await getSettings();
  return { contact, bank: bankTransferDetails(bank), delivery, stampDuty: invoice.stampDuty };
};

module.exports = { DEFAULTS, getSettings, updateSettings, publicSettings, bankTransferDetails };
