const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { auth, checkPermission } = require('../middleware/auth');

// GET /api/admin/customers - Get all customers
router.get('/', auth, checkPermission('users'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean(),
  query('isEmailVerified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isEmailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isEmailVerified !== undefined) {
      filter.isEmailVerified = isEmailVerified === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .select('-password -emailVerificationToken -passwordResetToken')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Customer.countDocuments(filter)
    ]);

    res.json({
      customers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

// GET /api/admin/customers/:id - Get single customer
router.get('/:id', auth, checkPermission('users'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get customer's order statistics
    const orderStats = await Order.aggregate([
      { $match: { customerId: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product', 'name');

    res.json({
      customer,
      stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 },
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Error fetching customer' });
  }
});

// PUT /api/admin/customers/:id - Update customer
router.put('/:id', auth, checkPermission('users'), [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/),
  body('isActive').optional().isBoolean(),
  body('isEmailVerified').optional().isBoolean(),
  body('loyaltyPoints').optional().isInt({ min: 0 }),
  body('preferences.language').optional().isIn(['fr', 'ar', 'en']),
  body('preferences.newsletter').optional().isBoolean(),
  body('preferences.smsNotifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error updating customer' });
  }
});

// PUT /api/admin/customers/:id/toggle-status - Toggle customer status
router.put('/:id/toggle-status', auth, checkPermission('users'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    res.json({ 
      message: 'Customer status updated successfully', 
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling customer status:', error);
    res.status(500).json({ message: 'Error updating customer status' });
  }
});

// PUT /api/admin/customers/:id/verify-email - Verify customer email
router.put('/:id/verify-email', auth, checkPermission('users'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { 
        isEmailVerified: true,
        emailVerificationToken: undefined
      },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer email verified successfully', customer });
  } catch (error) {
    console.error('Error verifying customer email:', error);
    res.status(500).json({ message: 'Error verifying customer email' });
  }
});

// PUT /api/admin/customers/:id/loyalty-points - Update customer loyalty points
router.put('/:id/loyalty-points', auth, checkPermission('users'), [
  body('points').isInt({ min: 0 }).withMessage('Points must be a non-negative integer'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { points, reason } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { loyaltyPoints: points },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Log the loyalty points change (you might want to create a separate model for this)
    console.log(`Loyalty points updated for customer ${customer.email}: ${points} points. Reason: ${reason || 'Admin adjustment'}`);

    res.json({ message: 'Loyalty points updated successfully', customer });
  } catch (error) {
    console.error('Error updating loyalty points:', error);
    res.status(500).json({ message: 'Error updating loyalty points' });
  }
});

// GET /api/admin/customers/stats/overview - Get customer statistics overview
router.get('/stats/overview', auth, checkPermission('users'), async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      verifiedCustomers,
      newCustomersThisMonth,
      topCustomers
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ isEmailVerified: true }),
      Customer.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      Customer.find({ isActive: true })
        .sort({ totalSpent: -1 })
        .limit(5)
        .select('firstName lastName email totalSpent orderCount')
    ]);

    res.json({
      totalCustomers,
      activeCustomers,
      verifiedCustomers,
      newCustomersThisMonth,
      topCustomers
    });
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    res.status(500).json({ message: 'Error fetching customer statistics' });
  }
});

// DELETE /api/admin/customers/:id - Delete customer (soft delete)
router.delete('/:id', auth, checkPermission('users'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if customer has orders
    const orderCount = await Order.countDocuments({ customerId: customer._id });
    if (orderCount > 0) {
      // Soft delete - deactivate instead of deleting
      customer.isActive = false;
      customer.email = `deleted_${Date.now()}_${customer.email}`;
      await customer.save();
      
      return res.json({ 
        message: 'Customer account deactivated successfully (has order history)' 
      });
    }

    // Hard delete if no orders
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Error deleting customer' });
  }
});

module.exports = router;
