const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { customerAuth, optionalCustomerAuth, requireEmailVerification } = require('../middleware/customerAuth');

// POST /api/customers/register - Customer registration
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Please enter a valid Tunisian phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, dateOfBirth, gender } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with this email already exists' });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create new customer
    const customer = new Customer({
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      emailVerificationToken
    });

    await customer.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        customerId: customer._id,
        email: customer.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // TODO: Send verification email
    console.log(`Email verification token for ${email}: ${emailVerificationToken}`);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      token,
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        phone: customer.phone,
        isEmailVerified: customer.isEmailVerified,
        loyaltyPoints: customer.loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error creating customer account' });
  }
});

// POST /api/customers/login - Customer login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find customer by credentials
    const customer = await Customer.findByCredentials(email, password);

    // Generate JWT token
    const token = jwt.sign(
      { 
        customerId: customer._id,
        email: customer.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    res.json({
      message: 'Login successful',
      token,
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        phone: customer.phone,
        isEmailVerified: customer.isEmailVerified,
        loyaltyPoints: customer.loyaltyPoints,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastLogin: customer.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
});

// GET /api/customers/me - Get current customer info
router.get('/me', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId).select('-password');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        isEmailVerified: customer.isEmailVerified,
        addresses: customer.addresses,
        preferences: customer.preferences,
        loyaltyPoints: customer.loyaltyPoints,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastLogin: customer.lastLogin,
        avatar: customer.avatar
      }
    });
  } catch (error) {
    console.error('Error fetching customer info:', error);
    res.status(500).json({ message: 'Error fetching customer information' });
  }
});

// PUT /api/customers/profile - Update customer profile
router.put('/profile', customerAuth, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Please enter a valid Tunisian phone number'),
  body('dateOfBirth').optional().isISO8601().withMessage('Please enter a valid date'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
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

    const { firstName, lastName, phone, dateOfBirth, gender, preferences } = req.body;

    // Update fields
    if (firstName !== undefined) customer.firstName = firstName;
    if (lastName !== undefined) customer.lastName = lastName;
    if (phone !== undefined) customer.phone = phone;
    if (dateOfBirth !== undefined) customer.dateOfBirth = dateOfBirth;
    if (gender !== undefined) customer.gender = gender;
    if (preferences !== undefined) {
      customer.preferences = { ...customer.preferences, ...preferences };
    }

    await customer.save();

    res.json({
      message: 'Profile updated successfully',
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        preferences: customer.preferences
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// POST /api/customers/verify-email - Verify email address
router.post('/verify-email', [
  body('token').isLength({ min: 1 }).withMessage('Verification token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    const customer = await Customer.findOne({ emailVerificationToken: token });
    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    customer.isEmailVerified = true;
    customer.emailVerificationToken = undefined;
    await customer.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
});

// POST /api/customers/forgot-password - Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    customer.passwordResetToken = resetToken;
    customer.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await customer.save();

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// POST /api/customers/reset-password - Reset password with token
router.post('/reset-password', [
  body('token').isLength({ min: 1 }).withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const customer = await Customer.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    customer.password = password;
    customer.passwordResetToken = undefined;
    customer.passwordResetExpires = undefined;
    await customer.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// PUT /api/customers/change-password - Change password (authenticated)
router.put('/change-password', customerAuth, [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify current password
    const isMatch = await customer.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    customer.password = newPassword;
    await customer.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

module.exports = router;
