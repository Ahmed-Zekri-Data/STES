const express = require('express');
const router = express.Router();
const { signCustomerToken } = require('../config/jwt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { customerAuth } = require('../middleware/customerAuth');
const emailNotificationService = require('../services/emailNotificationService');

// Links in emails carry a random code; the database keeps only its hash,
// so a copy of the database can't be used to confirm or reset accounts.
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Email confirmation links are valid for a week. A new request within two
// minutes doesn't send another email.
const VERIFY_LINK_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFY_RESEND_MS = 2 * 60 * 1000;

// Gives the customer a new confirmation link and emails it (in the
// background). Returns false when one was sent moments ago.
const sendVerificationLink = async (customer) => {
  const sentRecently = customer.emailVerificationExpires
    && customer.emailVerificationExpires.getTime() - VERIFY_LINK_MS + VERIFY_RESEND_MS > Date.now();
  if (sentRecently) return false;

  const token = crypto.randomBytes(32).toString('hex');
  customer.emailVerificationToken = hashToken(token);
  customer.emailVerificationExpires = new Date(Date.now() + VERIFY_LINK_MS);
  await customer.save();
  emailNotificationService.sendEmailVerification(customer, token);
  return true;
};

// What the shop keeps about the logged-in customer
const sessionCustomer = (customer) => ({
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
});

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

    // Create new customer
    const customer = new Customer({
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender
    });

    await customer.save();

    // Generate JWT token
    const token = signCustomerToken(customer);

    // Welcome email with the link to confirm the address
    await sendVerificationLink(customer);

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
    const token = signCustomerToken(customer);

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    res.json({
      message: 'Login successful',
      token,
      customer: sessionCustomer(customer)
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

    const customer = await Customer.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: Date.now() }
    });
    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    customer.isEmailVerified = true;
    customer.emailVerificationToken = undefined;
    customer.emailVerificationExpires = undefined;
    await customer.save();

    res.json({ message: 'Email verified successfully', email: customer.email });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
});

// POST /api/customers/resend-verification - Email a new confirmation link
router.post('/resend-verification', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.customerId);
    if (customer.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    await sendVerificationLink(customer);
    res.json({ message: `A confirmation link has been sent to ${customer.email}.` });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error sending the confirmation email' });
  }
});

// Password reset links are valid for an hour.
const RESET_LINK_MS = 60 * 60 * 1000;
// A new request within this time doesn't send another email
const RESET_RESEND_MS = 2 * 60 * 1000;
const RESET_REQUESTED_MESSAGE = 'If an account with that email exists, a password reset link has been sent.';

const findByResetToken = (token) => Customer.findOne({
  passwordResetToken: hashToken(token),
  passwordResetExpires: { $gt: Date.now() },
  isActive: true
});

// POST /api/customers/forgot-password - Email a password reset link
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // The answer is the same whether or not the account exists
    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer) {
      return res.json({ message: RESET_REQUESTED_MESSAGE });
    }

    const sentRecently = customer.passwordResetExpires
      && customer.passwordResetExpires.getTime() - RESET_LINK_MS + RESET_RESEND_MS > Date.now();
    if (sentRecently) {
      return res.json({ message: RESET_REQUESTED_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    customer.passwordResetToken = hashToken(resetToken);
    customer.passwordResetExpires = Date.now() + RESET_LINK_MS;
    await customer.save();

    // Sent in the background: the answer doesn't wait for the mail server
    emailNotificationService.sendPasswordReset(customer, resetToken);

    res.json({ message: RESET_REQUESTED_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// POST /api/customers/reset-password/check - Is this reset link still valid?
router.post('/reset-password/check', [
  body('token').isLength({ min: 1 }).withMessage('Reset token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await findByResetToken(req.body.token);
    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    res.json({ valid: true, email: customer.email });
  } catch (error) {
    console.error('Reset link check error:', error);
    res.status(500).json({ message: 'Error checking reset link' });
  }
});

// POST /api/customers/reset-password - Choose a new password from the link.
// Logs the customer in and signs out every other session.
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

    const customer = await findByResetToken(token);
    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    customer.password = password;
    customer.passwordResetToken = undefined;
    customer.passwordResetExpires = undefined;
    // Signs out every session started with the old password
    customer.sessionVersion = (customer.sessionVersion || 0) + 1;
    // The link proves the customer owns the email: lift a lockout
    customer.loginAttempts = 0;
    customer.lockUntil = undefined;
    customer.lastLogin = new Date();
    await customer.save();

    res.json({
      message: 'Password reset successfully',
      token: signCustomerToken(customer),
      customer: sessionCustomer(customer)
    });
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
