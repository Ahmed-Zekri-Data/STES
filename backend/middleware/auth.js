const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin) {
      return res.status(401).json({ message: 'Token is not valid. Admin not found.' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    if (admin.isLocked) {
      return res.status(401).json({ message: 'Account is temporarily locked.' });
    }

    // Add admin info to request
    req.admin = {
      adminId: admin._id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Middleware to check specific permissions
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has the required permission
    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Access denied. Required permission: ${permission}` 
      });
    }

    next();
  };
};

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ 
      message: 'Access denied. Super admin privileges required.' 
    });
  }

  next();
};

module.exports = {
  auth,
  checkPermission,
  requireSuperAdmin
};
