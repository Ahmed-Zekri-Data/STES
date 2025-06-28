const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const customerAuth = require('../middleware/customerAuth'); // We will create this next

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET, { // Fallback to JWT_SECRET if CUSTOMER_JWT_SECRET is not set
    expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '30d', // Default to 30 days
  });
};

// @route   POST /api/customer/auth/register
// @desc    Register a new customer
// @access  Public
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  try {
    // Check if customer already exists
    let customer = await Customer.findOne({ email: email.toLowerCase() });
    if (customer) {
      return res.status(400).json({ message: 'Customer already exists with this email' });
    }

    // Create new customer instance
    // Password will be hashed by the pre-save hook in the Customer model
    customer = new Customer({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone, // Optional
    });

    await customer.save();

    // Generate token
    const token = generateToken(customer._id);

    res.status(201).json({
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Register error:', error.message);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/customer/auth/login
// @desc    Authenticate customer & get token (Login)
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // Using the static method from the Customer model
    const customer = await Customer.findByCredentials(email, password);

    // Customer found, password matched, and account is not locked by the model's logic
    // The findByCredentials method also handles resetting login attempts on success

    // Update lastLogin
    customer.lastLogin = Date.now();
    await customer.save();

    const token = generateToken(customer._id);

    res.json({
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        lastLogin: customer.lastLogin,
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error.message);
    // The findByCredentials method throws errors with specific messages for invalid credentials or locked accounts
    if (error.message === 'Invalid credentials' || error.message.startsWith('Account is temporarily locked')) {
        return res.status(401).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/customer/auth/me
// @desc    Get current logged-in customer details
// @access  Private (Protected by customerAuth middleware)
router.get('/me', customerAuth, async (req, res) => {
  try {
    // req.customer is attached by the customerAuth middleware
    // We select only the fields we want to return
    const customer = await Customer.findById(req.customer.id).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get me error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/customer/auth/orders
// @desc    Get all orders for the authenticated customer
// @access  Private (Protected by customerAuth middleware)
router.get('/orders', customerAuth, async (req, res) => {
  try {
    // req.customer is attached by the customerAuth middleware and contains the authenticated customer object
    const orders = await Order.find({ customerId: req.customer._id })
      .sort({ createdAt: -1 }) // Sort by most recent
      .populate('items.product', 'name images price slug category') // Populate product details
      .lean(); // Use .lean() for faster queries if not modifying the docs

    if (!orders) {
      // This case might not be hit if find returns an empty array, but good for robustness
      return res.status(404).json({ message: 'No orders found for this customer.' });
    }

    res.json(orders);
  } catch (error) {
    console.error('Get customer orders error:', error.message);
    res.status(500).json({ message: 'Server error while fetching orders.' });
  }
});

// @route   GET /api/customer/auth/profile
// @desc    Get current logged-in customer's profile
// @access  Private (Protected by customerAuth middleware)
router.get('/profile', customerAuth, async (req, res) => {
  // req.customer is already populated by the customerAuth middleware
  // and sensitive fields were excluded by .select() in the middleware
  // or in the GET /me route if that's what the middleware sets.
  // The middleware currently sets the full customer object (minus password etc.)
  res.json(req.customer);
});

// @route   PUT /api/customer/auth/profile
// @desc    Update current logged-in customer's profile
// @access  Private (Protected by customerAuth middleware)
router.put('/profile', customerAuth, async (req, res) => {
  const { firstName, lastName, phone, email } = req.body;
  const customerId = req.customer._id; // ID from authenticated customer

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fields to update
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phone) updateFields.phone = phone;
    // Add any other updatable fields here, e.g., dateOfBirth, gender from the model

    // Handle email change - check for uniqueness if it's different
    if (email && email.toLowerCase() !== customer.email) {
      const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
      if (existingCustomer && existingCustomer._id.toString() !== customerId.toString()) {
        return res.status(400).json({ message: 'Email already in use by another account' });
      }
      updateFields.email = email.toLowerCase();
      // If email is changed, you might want to set isEmailVerified to false
      // and trigger a new verification email. For MVP, we'll just update it.
      // updateFields.isEmailVerified = false;
    }

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: updateFields },
      { new: true, runValidators: true } // Return updated doc, run schema validators
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil'); // Exclude sensitive fields

    if (!updatedCustomer) {
        return res.status(404).json({ message: 'Customer not found after update attempt.' });
    }

    res.json({
        message: 'Profile updated successfully',
        customer: updatedCustomer
    });

  } catch (error) {
    console.error('Update profile error:', error.message);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during profile update' });
  }
});


module.exports = router;
