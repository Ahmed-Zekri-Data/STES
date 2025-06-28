const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/auth');

// POST /api/auth/login - Admin login
router.post('/login', [
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find admin by credentials
    const admin = await Admin.findByCredentials(username, password);

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id,
        username: admin.username,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
});

// POST /api/auth/register - Register new admin (Super Admin only)
router.post('/register', auth, [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'super_admin']).withMessage('Invalid role'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    // Check if requesting admin is super admin
    const requestingAdmin = await Admin.findById(req.admin.adminId);
    if (requestingAdmin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can create new admin accounts' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName, role, permissions } = req.body;

    // Check if username or email already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Username or email already exists' 
      });
    }

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'admin',
      permissions: permissions || ['products', 'orders', 'forms']
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin account created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Error creating admin account' });
  }
});

// GET /api/auth/me - Get current admin info
router.get('/me', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error fetching admin info:', error);
    res.status(500).json({ message: 'Error fetching admin information' });
  }
});

// PUT /api/auth/profile - Update admin profile
router.put('/profile', auth, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email } = req.body;
    
    // Check if email is already taken by another admin
    if (email) {
      const existingAdmin = await Admin.findOne({ 
        email, 
        _id: { $ne: req.admin.adminId } 
      });
      
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;

    const admin = await Admin.findByIdAndUpdate(
      req.admin.adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// PUT /api/auth/password - Change password
router.put('/password', auth, [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin.adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
