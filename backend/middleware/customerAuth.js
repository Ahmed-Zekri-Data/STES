const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const customerAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if customer still exists and is active
    const customer = await Customer.findById(decoded.customerId).select('-password');
    
    if (!customer) {
      return res.status(401).json({ message: 'Token is not valid. Customer not found.' });
    }

    if (!customer.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    if (customer.isLocked) {
      return res.status(401).json({ message: 'Account is temporarily locked.' });
    }

    // Add customer info to request
    req.customer = {
      customerId: customer._id,
      email: customer.email,
      fullName: customer.fullName,
      isEmailVerified: customer.isEmailVerified
    };

    next();
  } catch (error) {
    console.error('Customer auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalCustomerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.customer = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const customer = await Customer.findById(decoded.customerId).select('-password');
    
    if (customer && customer.isActive && !customer.isLocked) {
      req.customer = {
        customerId: customer._id,
        email: customer.email,
        fullName: customer.fullName,
        isEmailVerified: customer.isEmailVerified
      };
    } else {
      req.customer = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without customer info
    req.customer = null;
    next();
  }
};

// Middleware to check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.customer) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!req.customer.isEmailVerified) {
    return res.status(403).json({ 
      message: 'Email verification required. Please check your email and verify your account.',
      requiresEmailVerification: true
    });
  }

  next();
};

module.exports = {
  customerAuth,
  optionalCustomerAuth,
  requireEmailVerification
};
