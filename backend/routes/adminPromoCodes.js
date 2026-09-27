const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const PromoCode = require('../models/PromoCode');
const Order = require('../models/Order');
const { auth, checkPermission } = require('../middleware/auth');

// Promo codes are part of selling: admins allowed to manage orders
const promoAdmin = [auth, checkPermission('orders')];

// Fields the admin can set. usedCount is kept by checkout only.
const EDITABLE = ['code', 'description', 'type', 'value', 'minOrder', 'maxDiscount', 'startsAt', 'expiresAt', 'usageLimit', 'isActive'];

// Blank optional fields arrive as "" from the admin form and mean "none"
const OPTIONAL_NULLS = ['maxDiscount', 'startsAt', 'expiresAt', 'usageLimit'];

const promoFields = (source) => {
  const fields = {};
  for (const key of EDITABLE) {
    if (source[key] === undefined) continue;
    fields[key] = OPTIONAL_NULLS.includes(key) && (source[key] === '' || source[key] === null) ? null : source[key];
  }
  if (fields.minOrder === '' || fields.minOrder === null) fields.minOrder = 0;
  return fields;
};

const optionalNumber = (field, message, min = 0) => body(field)
  .optional({ values: 'null' })
  .if(value => value !== '')
  .isFloat({ min }).withMessage(message).toFloat();

const validators = (creating) => [
  (creating ? body('code') : body('code').optional())
    .trim().toUpperCase().matches(/^[A-Z0-9_-]{3,30}$/).withMessage('Code must be 3 to 30 letters, digits, - or _'),
  (creating ? body('type') : body('type').optional()).isIn(['percent', 'fixed']).withMessage('Type must be percent or fixed'),
  (creating ? body('value') : body('value').optional()).isFloat({ gt: 0 }).withMessage('Value must be positive').toFloat(),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  optionalNumber('minOrder', 'Minimum order must be 0 or more'),
  optionalNumber('maxDiscount', 'Maximum discount must be 0 or more'),
  body('usageLimit').optional({ values: 'null' }).if(value => value !== '').isInt({ min: 1 }).withMessage('Usage limit must be at least 1').toInt(),
  body('startsAt').optional({ values: 'null' }).if(value => value !== '').isISO8601().withMessage('Invalid start date').toDate(),
  body('expiresAt').optional({ values: 'null' }).if(value => value !== '').isISO8601().withMessage('Invalid end date').toDate(),
  body('isActive').optional().isBoolean().toBoolean()
];

// What checkout would say about the code right now
const statusOf = (promo, now = new Date()) => {
  if (!promo.isActive) return 'disabled';
  if (promo.expiresAt && promo.expiresAt <= now) return 'expired';
  if (promo.startsAt && promo.startsAt > now) return 'scheduled';
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) return 'used_up';
  return 'active';
};

// Rules that involve more than one field
const checkConsistency = (promo) => {
  if (promo.type === 'percent' && promo.value > 100) return 'A percentage cannot exceed 100';
  if (promo.startsAt && promo.expiresAt && promo.expiresAt <= promo.startsAt) return 'The end date must be after the start date';
  return null;
};

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

// GET /api/admin/promo-codes - All codes, newest first, with what they gave
router.get('/', promoAdmin, async (req, res) => {
  try {
    const [codes, usage] = await Promise.all([
      PromoCode.find().sort({ createdAt: -1 }).lean(),
      Order.aggregate([
        { $match: { 'pricing.discountCode': { $exists: true, $ne: null }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$pricing.discountCode', orders: { $sum: 1 }, discountTotal: { $sum: '$pricing.discountAmount' } } }
      ])
    ]);
    const byCode = new Map(usage.map(u => [u._id, u]));
    res.json({
      promoCodes: codes.map(code => ({
        ...code,
        status: statusOf(code),
        orders: byCode.get(code.code)?.orders || 0,
        discountTotal: Math.round((byCode.get(code.code)?.discountTotal || 0) * 1000) / 1000
      }))
    });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ message: 'Error fetching promo codes' });
  }
});

// POST /api/admin/promo-codes - Create a code
router.post('/', promoAdmin, validators(true), async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const fields = promoFields(req.body);
    const problem = checkConsistency(fields);
    if (problem) return res.status(400).json({ message: problem });

    const promo = await PromoCode.create(fields);
    res.status(201).json({ ...promo.toObject(), status: statusOf(promo), orders: 0, discountTotal: 0 });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A promo code with this code already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0].message });
    }
    console.error('Error creating promo code:', error);
    res.status(500).json({ message: 'Error creating promo code' });
  }
});

// PUT /api/admin/promo-codes/:id - Change a code
router.put('/:id', promoAdmin, param('id').isMongoId(), validators(false), async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promo code not found' });

    const fields = promoFields(req.body);
    // Orders keep the code they used: once used, it can no longer be renamed
    if (fields.code && fields.code !== promo.code && promo.usedCount > 0) {
      return res.status(400).json({ message: 'This code has been used and can no longer be renamed; create a new code instead' });
    }
    Object.assign(promo, fields);
    const problem = checkConsistency(promo);
    if (problem) return res.status(400).json({ message: problem });

    await promo.save();
    res.json({ ...promo.toObject(), status: statusOf(promo) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A promo code with this code already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0].message });
    }
    console.error('Error updating promo code:', error);
    res.status(500).json({ message: 'Error updating promo code' });
  }
});

// DELETE /api/admin/promo-codes/:id - Remove a code (orders keep their discount)
router.delete('/:id', promoAdmin, param('id').isMongoId(), async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promo code not found' });
    res.json({ message: 'Promo code deleted' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ message: 'Error deleting promo code' });
  }
});

module.exports = router;
module.exports.statusOf = statusOf;
