const Settings = require('../models/Settings');
const { LOW_STOCK_THRESHOLD } = require('../config/inventory');
const { formatRib, ibanOf } = require('../utils/rib');
const { DEFAULT_CALENDAR } = require('../config/maintenanceCalendar');

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
  lowStockThreshold: LOW_STOCK_THRESHOLD,
  // Home page: nothing chosen yet, so those parts of the page stay hidden
  showcase: {
    hotspots: { pump: null, filter: null, robot: null, lights: null, ring: null },
    problems: { green: [], cloudy: [], dirty: [], cold: [] },
    sizes: [],
    lights: null,
    options: [],
    packs: [],
    showMap: true,
    partnerBadge: ''
  },
  // Pool builder: no equipment and no construction price until the shop sets them
  builder: {
    equipment: [],
    pricePerM2Min: 0,
    pricePerM2Max: 0
  },
  // Pool care reminders: the default calendar until the shop changes it
  reminders: {
    calendar: DEFAULT_CALENDAR
  }
};

const pick = (saved, defaults) => Object.fromEntries(
  Object.keys(defaults).map(key => [key, saved?.[key] ?? defaults[key]])
);

// Each reminder as saved, or its default; in date order
const calendarOf = (saved) => DEFAULT_CALENDAR
  .map(reminder => ({ ...reminder, ...saved?.find(s => s.key === reminder.key) }))
  .sort((a, b) => a.month - b.month || a.day - b.day);

// The shop settings, with defaults for anything never saved
const getSettings = async () => {
  const saved = await Settings.findOne({ key: 'shop' }).lean();
  return {
    contact: pick(saved?.contact, DEFAULTS.contact),
    bank: pick(saved?.bank, DEFAULTS.bank),
    delivery: pick(saved?.delivery, DEFAULTS.delivery),
    invoice: pick(saved?.invoice, DEFAULTS.invoice),
    lowStockThreshold: saved?.lowStockThreshold ?? DEFAULTS.lowStockThreshold,
    showcase: {
      ...pick(saved?.showcase, DEFAULTS.showcase),
      hotspots: pick(saved?.showcase?.hotspots, DEFAULTS.showcase.hotspots),
      problems: pick(saved?.showcase?.problems, DEFAULTS.showcase.problems)
    },
    builder: pick(saved?.builder, DEFAULTS.builder),
    reminders: { calendar: calendarOf(saved?.reminders?.calendar) },
    updatedAt: saved?.updatedAt || null
  };
};

// Saves the given sections; anything not given keeps its value
const updateSettings = async ({ contact, bank, delivery, invoice, lowStockThreshold, showcase, builder, reminders }) => {
  const set = {};
  for (const [section, values] of Object.entries({ contact, bank, delivery, invoice, showcase, builder, reminders })) {
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
