const Customer = require('../models/Customer');
const { verifyCustomerToken } = require('../config/jwt');

// Returns the token from a "Bearer <token>" Authorization header, or null.
const getBearerToken = (req) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return null;
  }

  return parts[1];
};

// Routes read the authenticated customer's id as req.customer.customerId.
const toRequestCustomer = (customer) => ({
  customerId: customer._id,
  email: customer.email,
  fullName: customer.fullName,
  isEmailVerified: customer.isEmailVerified
});

const customerAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = verifyCustomerToken(token);

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

    req.customer = toRequestCustomer(customer);

    next();
  } catch (error) {
    console.error('Customer auth middleware error:', error.message);

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
  req.customer = null;

  try {
    const token = getBearerToken(req);

    if (token) {
      const decoded = verifyCustomerToken(token);
      const customer = await Customer.findById(decoded.customerId).select('-password');

      if (customer && customer.isActive && !customer.isLocked) {
        req.customer = toRequestCustomer(customer);
      }
    }
  } catch (error) {
    // Invalid or expired token: continue as a guest
  }

  next();
};

// Middleware to check if email is verified (run after customerAuth)
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
