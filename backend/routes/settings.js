const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const { getSettings, updateSettings, publicSettings } = require('../services/settingsService');

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
  price('delivery.freeDeliveryOver'),
  price('delivery.baseCost'),
  price('delivery.cashOnDeliveryFee'),
  body('lowStockThreshold').optional().isInt({ min: 0, max: 10000 }).withMessage('Low stock must be a whole number from 0').toInt()
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
