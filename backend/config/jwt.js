const jwt = require('jsonwebtoken');

const requireSecret = (value, name) => {
  if (!value) {
    throw new Error(`${name} is not set. Add it to the .env file at the repository root.`);
  }
  return value;
};

const adminSecret = () => requireSecret(process.env.JWT_SECRET, 'JWT_SECRET');

// Customers may use their own secret; JWT_SECRET is the fallback.
const customerSecret = () => requireSecret(
  process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET,
  'CUSTOMER_JWT_SECRET or JWT_SECRET'
);

const signAdminToken = (admin) => jwt.sign(
  { adminId: admin._id, username: admin.username, role: admin.role },
  adminSecret(),
  { expiresIn: '24h' }
);

const verifyAdminToken = (token) => jwt.verify(token, adminSecret());

const signCustomerToken = (customer) => jwt.sign(
  { customerId: customer._id, email: customer.email },
  customerSecret(),
  { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '30d' }
);

const verifyCustomerToken = (token) => jwt.verify(token, customerSecret());

module.exports = {
  signAdminToken,
  verifyAdminToken,
  signCustomerToken,
  verifyCustomerToken
};
