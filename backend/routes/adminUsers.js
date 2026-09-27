const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { auth, requireSuperAdmin } = require('../middleware/auth');

// Managing admin accounts is for super admins only (the "users"
// permission is about customers)
router.use(auth, requireSuperAdmin);

const PERMISSIONS = ['products', 'orders', 'forms', 'users', 'settings'];
const MIN_PASSWORD_LENGTH = 8;

const adminView = (admin) => ({
  id: admin._id,
  username: admin.username,
  email: admin.email,
  firstName: admin.firstName,
  lastName: admin.lastName,
  fullName: admin.fullName,
  role: admin.role,
  // Super admins can do everything, whatever is stored
  permissions: admin.role === 'super_admin' ? PERMISSIONS : admin.permissions,
  isActive: admin.isActive,
  isLocked: admin.isLocked,
  lastLogin: admin.lastLogin,
  createdAt: admin.createdAt
});

const validationFailed = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const isSelf = (req, admin) => admin._id.equals(req.admin.adminId);

const findTarget = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: 'Admin not found' });
    return null;
  }
  const admin = await Admin.findById(req.params.id);
  if (!admin) res.status(404).json({ message: 'Admin not found' });
  return admin;
};

const duplicateMessage = async ({ username, email }, exceptId) => {
  const clash = await Admin.findOne({
    _id: { $ne: exceptId },
    $or: [
      ...(username ? [{ username }] : []),
      ...(email ? [{ email }] : [])
    ]
  }).lean();
  if (!clash) return null;
  return clash.username === username ? 'This username is already taken' : 'This email is already used by another admin';
};

const nameRules = (optional) => ['firstName', 'lastName'].map(field => {
  const rule = body(field);
  return (optional ? rule.optional() : rule).trim().isLength({ min: 1, max: 50 })
    .withMessage(`${field === 'firstName' ? 'First' : 'Last'} name is required (up to 50 characters)`);
});
const roleRules = [
  body('role').optional().isIn(['admin', 'super_admin']).withMessage('Role must be admin or super_admin'),
  body('permissions').optional().isArray().withMessage('Permissions must be a list')
    .custom(list => list.every(p => PERMISSIONS.includes(p))).withMessage(`Permissions can only be: ${PERMISSIONS.join(', ')}`)
];
const emailRule = (optional) => (optional ? body('email').optional() : body('email'))
  .trim().toLowerCase().isEmail().withMessage('Valid email is required');
const passwordRule = body('password').isLength({ min: MIN_PASSWORD_LENGTH })
  .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

// GET /api/admin/users - Every admin account, active ones first
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ isActive: -1, role: -1, username: 1 });
    res.json({ admins: admins.map(adminView), permissions: PERMISSIONS });
  } catch (error) {
    console.error('Error listing admins:', error);
    res.status(500).json({ message: 'Error loading admin accounts' });
  }
});

// POST /api/admin/users - Add an admin
router.post('/', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[A-Za-z0-9._-]+$/).withMessage('Username can only contain letters, digits, dots, dashes and underscores'),
  emailRule(false),
  passwordRule,
  ...nameRules(false),
  ...roleRules
], async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { username, email, password, firstName, lastName, role = 'admin', permissions = [] } = req.body;
    const duplicate = await duplicateMessage({ username, email });
    if (duplicate) return res.status(400).json({ message: duplicate });

    const admin = await Admin.create({
      username, email, password, firstName, lastName, role,
      permissions: role === 'super_admin' ? PERMISSIONS : permissions,
      isActive: true
    });
    res.status(201).json({ message: 'Admin account created', admin: adminView(admin) });
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.code === 11000) return res.status(400).json({ message: 'Username or email already exists' });
    res.status(500).json({ message: 'Error creating admin account' });
  }
});

// PUT /api/admin/users/:id - Change name, email, role, permissions or active state
router.put('/:id', [
  ...nameRules(true),
  emailRule(true),
  ...roleRules,
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean()
], async (req, res) => {
  try {
    if (validationFailed(req, res)) return;
    const admin = await findTarget(req, res);
    if (!admin) return;

    const { firstName, lastName, email, role, permissions, isActive } = req.body;
    const deactivated = isActive === false && admin.isActive;

    // The one making the change is an active super admin and can't demote or
    // deactivate themselves, so there is always an active super admin left
    if (isSelf(req, admin) && (role !== undefined && role !== admin.role || deactivated)) {
      return res.status(400).json({ message: 'You cannot change your own role or deactivate yourself' });
    }
    if (email !== undefined) {
      const duplicate = await duplicateMessage({ email }, admin._id);
      if (duplicate) return res.status(400).json({ message: duplicate });
    }

    if (firstName !== undefined) admin.firstName = firstName;
    if (lastName !== undefined) admin.lastName = lastName;
    if (email !== undefined) admin.email = email;
    if (role !== undefined) admin.role = role;
    if (admin.role === 'super_admin') {
      admin.permissions = PERMISSIONS;
    } else if (permissions !== undefined) {
      admin.permissions = permissions;
    }
    if (isActive !== undefined) admin.isActive = isActive;
    // A deactivated admin is signed out everywhere, also if reactivated later
    if (deactivated) admin.sessionVersion = (admin.sessionVersion || 0) + 1;

    await admin.save();
    res.json({ message: 'Admin account updated', admin: adminView(admin) });
  } catch (error) {
    console.error('Error updating admin:', error);
    if (error.code === 11000) return res.status(400).json({ message: 'This email is already used by another admin' });
    res.status(500).json({ message: 'Error updating admin account' });
  }
});

// PUT /api/admin/users/:id/password - Set a new password for another admin
// (for example when they forgot theirs). Signs them out and unlocks them.
router.put('/:id/password', [passwordRule], async (req, res) => {
  try {
    if (validationFailed(req, res)) return;
    const admin = await findTarget(req, res);
    if (!admin) return;
    if (isSelf(req, admin)) {
      return res.status(400).json({ message: 'Change your own password in Settings → My account' });
    }

    admin.password = req.body.password;
    admin.sessionVersion = (admin.sessionVersion || 0) + 1;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    res.json({ message: 'Password changed. Give it to them privately.', admin: adminView(admin) });
  } catch (error) {
    console.error('Error setting admin password:', error);
    res.status(500).json({ message: 'Error setting the password' });
  }
});

// PUT /api/admin/users/:id/unlock - Lift the lock after too many failed logins
router.put('/:id/unlock', async (req, res) => {
  try {
    const admin = await findTarget(req, res);
    if (!admin) return;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    res.json({ message: 'Account unlocked', admin: adminView(admin) });
  } catch (error) {
    console.error('Error unlocking admin:', error);
    res.status(500).json({ message: 'Error unlocking the account' });
  }
});

module.exports = router;
