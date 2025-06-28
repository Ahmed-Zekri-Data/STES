const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const customerAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Token is not in Bearer format, authorization denied' });
    }
    const token = parts[1];
    
    if (!token) { // Should be caught by previous checks, but as a safeguard
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token using CUSTOMER_JWT_SECRET first, then JWT_SECRET as fallback
    const decoded = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-key-please-set-env'); // Ensure a fallback if neither is set
    
    // Check if customer still exists and is active
    // The token payload generated in customerAuth.js route contains `id` for customerId
    const customer = await Customer.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil');
    
    if (!customer) {
      return res.status(401).json({ message: 'Authorization denied. Customer not found.' });
    }

    if (!customer.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Authorization denied.' });
    }

    // The Customer model's findByCredentials and its own logic already handle locking.
    // However, a direct check here can be an additional safeguard if needed,
    // but might be redundant if all logins go through findByCredentials.
    // For now, relying on isActive. If isLocked is a separate concern for active sessions, it can be added.
    // if (customer.isLocked) { // isLocked is a virtual, ensure it's available or check lockUntil
    //   return res.status(401).json({ message: 'Account is temporarily locked.' });
    // }

    // Add customer info to request. We'll attach the customer object itself,
    // which is more versatile for subsequent route handlers.
    // The select('-password') above ensures password is not included.
    req.customer = customer;

    next();
  } catch (error) {
    console.error('Customer auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Authorization denied.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Authorization denied.' });
    }
    
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalCustomerAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      req.customer = null;
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.customer = null; // Invalid format, treat as no auth
      return next();
    }
    const token = parts[1];
    
    if (!token) {
      req.customer = null;
      return next();
    }

    // Verify token using CUSTOMER_JWT_SECRET first, then JWT_SECRET as fallback
    const decoded = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-key-please-set-env');
    const customer = await Customer.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil');
    
    if (customer && customer.isActive) { // Not checking isLocked here for optional, could be added
      req.customer = customer;
    } else {
      req.customer = null;
    }

    next();
  } catch (error) {
    // If token is invalid or any other error, just continue without customer info
    req.customer = null;
    next();
  }
};

// Middleware to check if email is verified
const requireEmailVerification = (req, res, next) => {
  // This middleware should run AFTER customerAuth, so req.customer should be populated
  if (!req.customer || !req.customer._id) { // Check if customer object exists
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!req.customer.isEmailVerified) {
    return res.status(403).json({ 
      message: 'Email verification required. Please check your email and verify your account.',
      requiresEmailVerification: true // Flag for frontend to handle
    });
  }

  next();
};

// Exporting only customerAuth for now as per the plan for the GET /me route.
// The other middlewares (optionalCustomerAuth, requireEmailVerification) are good but not immediately used by the current plan step.
// We can export them when they are needed.
// For now, the customerAuth.js route file only imports `customerAuth`.
// If we want to use the object export, the import in customerAuth.js route should be:
// const { customerAuth } = require('../middleware/customerAuth');

module.exports = customerAuth;

/*
// To export all:
module.exports = {
  customerAuth,
  optionalCustomerAuth,
  requireEmailVerification
};
*/
