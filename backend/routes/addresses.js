const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { customerAuth } = require('../middleware/customerAuth');

// Enough for home, work, family...; stops the list growing without end
const MAX_ADDRESSES = 10;

// The fields a customer can set on an address
const FIELDS = ['type', 'firstName', 'lastName', 'company', 'address1', 'address2', 'city', 'state', 'postalCode', 'phone', 'isDefault'];

// "+216 98 765 432" → "+21698765432"
const compactPhone = (value) => String(value || '').replace(/[\s.()-]/g, '');

// Rules for a new address (all required fields) or a change (only what is sent)
const addressRules = (isUpdate) => {
  const required = (field, message) => (isUpdate ? body(field).optional() : body(field))
    .trim().isLength({ min: 1, max: 100 }).withMessage(message);
  return [
    required('firstName', 'Le prénom est obligatoire'),
    required('lastName', 'Le nom est obligatoire'),
    required('address1', "L'adresse est obligatoire"),
    required('city', 'La ville est obligatoire'),
    required('state', 'Le gouvernorat est obligatoire'),
    body('company').optional().trim().isLength({ max: 100 }),
    body('address2').optional().trim().isLength({ max: 100 }),
    body('postalCode').optional({ values: 'falsy' }).trim().matches(/^\d{4}$/).withMessage('Le code postal a 4 chiffres'),
    body('phone').optional({ values: 'falsy' }).customSanitizer(compactPhone)
      .matches(/^(\+216)?[0-9]{8}$/).withMessage('Entrez un numéro tunisien valide (8 chiffres)'),
    body('type').optional().isIn(['home', 'work', 'other']).withMessage("Type d'adresse inconnu"),
    body('isDefault').optional().isBoolean().toBoolean()
  ];
};

const validId = param('id').isMongoId().withMessage('Adresse introuvable');

const failed = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const pick = (data) => Object.fromEntries(FIELDS.filter(field => data[field] !== undefined).map(field => [field, data[field]]));

const loadCustomer = async (req, res) => {
  const customer = await Customer.findById(req.customer.customerId);
  if (!customer) res.status(404).json({ message: 'Customer not found' });
  return customer;
};

const notFound = (res) => res.status(404).json({ message: 'Adresse introuvable' });

// GET /api/addresses - The customer's addresses, the default one first
router.get('/', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId).select('addresses');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ addresses: customer.addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Error fetching addresses' });
  }
});

// POST /api/addresses - Add an address (the first one becomes the default)
router.post('/', customerAuth, addressRules(false), async (req, res) => {
  try {
    if (failed(req, res)) return;
    const customer = await loadCustomer(req, res);
    if (!customer) return;
    if (customer.addresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({ message: `Vous pouvez enregistrer ${MAX_ADDRESSES} adresses au plus. Supprimez-en une pour en ajouter une autre.` });
    }

    await customer.addAddress({ type: 'home', country: 'Tunisia', isDefault: false, ...pick(req.body) });
    res.status(201).json({ message: 'Address added successfully', addresses: customer.addresses });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Error adding address' });
  }
});

// PUT /api/addresses/:id - Change an address
router.put('/:id', customerAuth, [validId, ...addressRules(true)], async (req, res) => {
  try {
    if (failed(req, res)) return;
    const customer = await loadCustomer(req, res);
    if (!customer) return;
    if (!customer.addresses.id(req.params.id)) return notFound(res);

    await customer.updateAddress(req.params.id, pick(req.body));
    res.json({ message: 'Address updated successfully', addresses: customer.addresses });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Error updating address' });
  }
});

// DELETE /api/addresses/:id - Remove an address (another becomes the default)
router.delete('/:id', customerAuth, [validId], async (req, res) => {
  try {
    if (failed(req, res)) return;
    const customer = await loadCustomer(req, res);
    if (!customer) return;
    if (!customer.addresses.id(req.params.id)) return notFound(res);

    await customer.removeAddress(req.params.id);
    res.json({ message: 'Address deleted successfully', addresses: customer.addresses });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Error deleting address' });
  }
});

// PUT /api/addresses/:id/default - Use this address by default
router.put('/:id/default', customerAuth, [validId], async (req, res) => {
  try {
    if (failed(req, res)) return;
    const customer = await loadCustomer(req, res);
    if (!customer) return;
    if (!customer.addresses.id(req.params.id)) return notFound(res);

    await customer.updateAddress(req.params.id, { isDefault: true });
    res.json({ message: 'Default address updated successfully', addresses: customer.addresses });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ message: 'Error setting default address' });
  }
});

module.exports = router;
