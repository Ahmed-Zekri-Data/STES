const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { customerAuth } = require('../middleware/customerAuth');

// GET /api/addresses - Get customer addresses
router.get('/', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId).select('addresses');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      addresses: customer.addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Error fetching addresses' });
  }
});

// POST /api/addresses - Add new address
router.post('/', customerAuth, [
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('address1').trim().isLength({ min: 1 }).withMessage('Address line 1 is required'),
  body('city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('state').trim().isLength({ min: 1 }).withMessage('State/Governorate is required'),
  body('postalCode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('country').optional().trim().isLength({ min: 1 }).withMessage('Country is required'),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Please enter a valid Tunisian phone number'),
  body('type').optional().isIn(['home', 'work', 'other']).withMessage('Invalid address type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const addressData = {
      type: req.body.type || 'home',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      company: req.body.company,
      address1: req.body.address1,
      address2: req.body.address2,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country || 'Tunisia',
      phone: req.body.phone,
      isDefault: req.body.isDefault || false
    };

    await customer.addAddress(addressData);

    res.status(201).json({
      message: 'Address added successfully',
      addresses: customer.addresses
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Error adding address' });
  }
});

// PUT /api/addresses/:id - Update address
router.put('/:id', customerAuth, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('address1').optional().trim().isLength({ min: 1 }).withMessage('Address line 1 is required'),
  body('city').optional().trim().isLength({ min: 1 }).withMessage('City is required'),
  body('state').optional().trim().isLength({ min: 1 }).withMessage('State/Governorate is required'),
  body('postalCode').optional().trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Please enter a valid Tunisian phone number'),
  body('type').optional().isIn(['home', 'work', 'other']).withMessage('Invalid address type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const addressId = req.params.id;
    const updateData = req.body;

    await customer.updateAddress(addressId, updateData);

    res.json({
      message: 'Address updated successfully',
      addresses: customer.addresses
    });
  } catch (error) {
    console.error('Error updating address:', error);
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.status(500).json({ message: 'Error updating address' });
  }
});

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const addressId = req.params.id;
    await customer.removeAddress(addressId);

    res.json({
      message: 'Address deleted successfully',
      addresses: customer.addresses
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.status(500).json({ message: 'Error deleting address' });
  }
});

// PUT /api/addresses/:id/default - Set address as default
router.put('/:id/default', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const addressId = req.params.id;
    await customer.updateAddress(addressId, { isDefault: true });

    res.json({
      message: 'Default address updated successfully',
      addresses: customer.addresses
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.status(500).json({ message: 'Error setting default address' });
  }
});

module.exports = router;
