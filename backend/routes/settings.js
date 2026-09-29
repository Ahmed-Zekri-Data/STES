const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const { getSettings, updateSettings, publicSettings } = require('../services/settingsService');
const { isValidRib, formatRib } = require('../utils/rib');
const { isValidTaxId, normalizeTaxId } = require('../utils/taxId');
const { KINDS } = require('../services/poolPlanService');

// GET /api/settings - Contact details and delivery prices for the shop pages
const publicRouter = express.Router();
publicRouter.get('/', async (req, res) => {
  try {
    res.json(await publicSettings());
  } catch (error) {
    console.error('Error loading shop settings:', error);
    res.status(500).json({ message: 'Error loading settings' });
  }
});

// /api/admin/settings - Admin → Settings → Shop
const adminRouter = express.Router();
adminRouter.use(auth, checkPermission('settings'));

const PHONE = /^\+?[0-9 ().-]{6,25}$/;
const HOTSPOTS = ['pump', 'filter', 'robot', 'lights', 'ring'];
const PROBLEMS = ['green', 'cloudy', 'dirty', 'cold'];
// A chosen product, or empty (null / "") for none
const productOrNone = (field) => body(field).optional({ values: 'null' })
  .customSanitizer(value => (value === '' ? null : value))
  .custom(value => value === null || /^[a-f\d]{24}$/i.test(String(value))).withMessage('Choose a product from the list');
const productList = (field, max) => body(field).optional()
  .isArray({ max }).withMessage(`Choose up to ${max} products`)
  .custom(list => list.every(id => /^[a-f\d]{24}$/i.test(String(id)))).withMessage('Choose products from the list');
const price = (field) => body(field).optional()
  .isFloat({ min: 0, max: 100000 }).withMessage('Amounts must be between 0 and 100000 TND').toFloat();

adminRouter.get('/', async (req, res) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ message: 'Error loading settings' });
  }
});

adminRouter.put('/', [
  body('contact.phone').optional().trim().matches(PHONE).withMessage('Enter a phone number, for example +216 71 234 567'),
  // Empty hides the WhatsApp buttons
  body('contact.whatsapp').optional().trim()
    .custom(value => value === '' || PHONE.test(value)).withMessage('Enter a WhatsApp number, for example +216 98 765 432, or leave it empty'),
  body('contact.email').optional().trim().toLowerCase().isEmail().withMessage('Enter a valid contact email'),
  body('contact.address').optional().trim().isLength({ min: 1, max: 200 }).withMessage('The address is required (up to 200 characters)'),
  body('bank.bankName').optional().isString().trim().isLength({ max: 100 }).withMessage('The bank name is too long (up to 100 characters)'),
  body('bank.beneficiary').optional().isString().trim().isLength({ max: 100 }).withMessage('The account holder is too long (up to 100 characters)'),
  // Empty stops offering bank transfer
  body('bank.rib').optional().isString().trim()
    .custom(value => value === '' || isValidRib(value))
    .withMessage('Enter the 20-digit RIB exactly as on your bank statement (the last 2 digits are a check key)')
    .customSanitizer(value => (value ? formatRib(value) : '')),
  body('bank').optional().custom(bank => !bank?.rib || Boolean(String(bank.beneficiary || '').trim()))
    .withMessage('Enter the account holder with the RIB'),
  price('delivery.freeDeliveryOver'),
  price('delivery.baseCost'),
  price('delivery.cashOnDeliveryFee'),
  body('invoice.companyName').optional().isString().trim().isLength({ max: 120 }).withMessage('The company name is too long (up to 120 characters)'),
  body('invoice.taxId').optional().isString().trim()
    .custom(value => value === '' || isValidTaxId(value))
    .withMessage('Enter the matricule fiscal as on your tax card, for example 1234567A/A/M/000')
    .customSanitizer(value => normalizeTaxId(value)),
  body('invoice.tradeRegister').optional().isString().trim().isLength({ max: 60 }).withMessage('The trade register number is too long (up to 60 characters)'),
  body('invoice.address').optional().isString().trim().isLength({ max: 200 }).withMessage('The legal address is too long (up to 200 characters)'),
  body('invoice.stampDuty').optional().isFloat({ min: 0, max: 100 }).withMessage('The stamp duty must be between 0 and 100 TND').toFloat(),
  body('lowStockThreshold').optional().isInt({ min: 0, max: 10000 }).withMessage('Low stock must be a whole number from 0').toInt(),
  ...HOTSPOTS.map(key => productOrNone(`showcase.hotspots.${key}`)),
  ...PROBLEMS.map(key => productList(`showcase.problems.${key}`, 6)),
  body('showcase.sizes').optional().isArray({ max: 4 }).withMessage('Up to 4 pool sizes'),
  body('showcase.sizes.*.label').isString().trim().isLength({ min: 1, max: 20 }).withMessage('Each pool size needs a name (up to 20 characters)'),
  productOrNone('showcase.sizes.*.pump'),
  productOrNone('showcase.sizes.*.filter'),
  productOrNone('showcase.lights'),
  productList('showcase.options', 4),
  body('showcase.packs').optional().isArray({ max: 3 }).withMessage('Up to 3 packs'),
  body('showcase.packs.*.product').custom(value => /^[a-f\d]{24}$/i.test(String(value))).withMessage('Each pack needs the product it is sold as'),
  body('showcase.packs.*.season').optional().isString().trim().isLength({ max: 30 }).withMessage('The season label is too long (up to 30 characters)'),
  productList('showcase.packs.*.includes', 8),
  body('showcase.showMap').optional().isBoolean().withMessage('Show the map: yes or no').toBoolean(),
  body('showcase.partnerBadge').optional().isString().trim().isLength({ max: 60 }).withMessage('The partner badge is too long (up to 60 characters)'),
  body('builder.equipment').optional().isArray({ max: 12 }).withMessage('Up to 12 products in the pool builder'),
  body('builder.equipment.*.product').custom(value => /^[a-f\d]{24}$/i.test(String(value))).withMessage('Choose a product from the list'),
  body('builder.equipment.*.kind').isIn(KINDS).withMessage('Choose how the product is drawn'),
  body('builder.pricePerM2Min').optional().isFloat({ min: 0, max: 100000 }).withMessage('Prices per m² must be between 0 and 100000 TND').toFloat(),
  body('builder.pricePerM2Max').optional().isFloat({ min: 0, max: 100000 }).withMessage('Prices per m² must be between 0 and 100000 TND').toFloat(),
  body('builder').optional().custom(b => !(b?.pricePerM2Min > 0) || b.pricePerM2Max >= b.pricePerM2Min)
    .withMessage('The highest price per m² must be at least the lowest')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    const settings = await updateSettings(req.body);
    res.json({ message: 'Settings saved', settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Error saving settings' });
  }
});

module.exports = { publicRouter, adminRouter };
