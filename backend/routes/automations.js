const crypto = require('crypto');
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const CheckoutDraft = require('../models/CheckoutDraft');
const EmailOptOut = require('../models/EmailOptOut');
const Product = require('../models/Product');
const emailService = require('../services/emailNotificationService');
const { emailFromToken, automationStats } = require('../services/automationService');

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const publicRouter = express.Router();

// POST /api/checkout/draft - The checkout as it stands, once the customer
// has given their email: one reminder may follow if no order is placed
// (unless they ticked "no reminder"). Saved again at each step.
publicRouter.post('/checkout/draft', [
  body('draftId').isString().matches(/^[A-Za-z0-9-]{8,64}$/).withMessage('Invalid checkout'),
  body('email').isString().trim().toLowerCase().isEmail().withMessage('Indiquez une adresse email valide'),
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Le panier est vide'),
  body('items.*.productId').isMongoId().withMessage('Produit inconnu'),
  body('items.*.variant').optional({ values: 'null' }).isString().trim().isLength({ max: 40 }),
  body('items.*.quantity').isInt({ min: 1, max: 999 }).withMessage('Quantité invalide').toInt(),
  body('reminders').optional().isBoolean().toBoolean()
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { draftId, email, firstName, items, reminders = true } = req.body;
    await CheckoutDraft.findOneAndUpdate(
      { draftId, kind: 'checkout' },
      {
        $set: {
          email,
          firstName,
          reminders,
          items: items.map(item => ({ product: item.productId, ...(item.variant && { variant: item.variant }), quantity: item.quantity }))
        },
        $setOnInsert: { token: crypto.randomBytes(24).toString('hex'), kind: 'checkout' }
      },
      { upsert: true, runValidators: true }
    );
    res.status(204).end();
  } catch (error) {
    // The same draftId used for an order reminder: nothing to save
    if (error.code === 11000) return res.status(204).end();
    console.error('Error saving a checkout draft:', error);
    res.status(500).json({ message: 'Error saving the checkout' });
  }
});

// GET /api/checkout/draft/:token - The link of a cart reminder or of an
// "order again" email: the products to put back in the cart, as they are
// today (deleted products are left out)
publicRouter.get('/checkout/draft/:token', param('token').matches(/^[a-f\d]{48}$/).withMessage('Lien invalide'), async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const draft = await CheckoutDraft.findOne({ token: req.params.token }).lean();
    if (!draft) return res.status(404).json({ message: 'Ce lien a expiré : votre panier n’est plus disponible.' });
    const products = await Product.find({ _id: { $in: draft.items.map(item => item.product) } }).select('-reviews').lean();
    const byId = new Map(products.map(product => [String(product._id), product]));
    const items = draft.items
      .filter(item => byId.has(String(item.product)))
      .map(item => ({ product: byId.get(String(item.product)), variant: item.variant || null, quantity: item.quantity }));
    res.json({ items });
  } catch (error) {
    console.error('Error loading a checkout draft:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du panier' });
  }
});

// POST /api/emails/unsubscribe - The link at the bottom of each automatic
// email: no more of them for this address
publicRouter.post('/emails/unsubscribe', body('token').isString(), async (req, res) => {
  try {
    const email = emailFromToken(req.body.token);
    if (!email) return res.status(400).json({ message: 'Ce lien de désinscription n’est pas valide.' });
    await EmailOptOut.updateOne({ email }, { $setOnInsert: { email, at: new Date() } }, { upsert: true });
    res.json({ message: 'C’est noté : vous ne recevrez plus ces emails.', email });
  } catch (error) {
    console.error('Error unsubscribing from automatic emails:', error);
    res.status(500).json({ message: 'La désinscription n’a pas abouti. Réessayez plus tard.' });
  }
});

// /api/admin/automations - Admin → Settings → Marketing: what was sent
const adminRouter = express.Router();
adminRouter.use(auth, checkPermission('settings'));

adminRouter.get('/', async (req, res) => {
  try {
    res.json({
      sent: await automationStats(),
      optOuts: await EmailOptOut.countDocuments(),
      emailConfigured: emailService.isConfigured()
    });
  } catch (error) {
    console.error('Error loading automation stats:', error);
    res.status(500).json({ message: 'Error loading the automatic emails' });
  }
});

module.exports = { publicRouter, adminRouter };
