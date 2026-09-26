const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('../config/env');
const adminCredentials = require('./adminCredentials');

// Sets the password of the DEFAULT_ADMIN_EMAIL admin to DEFAULT_ADMIN_PASSWORD
// and unlocks the account.
const resetPassword = async () => {
  const { email, password } = adminCredentials();

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log(`No admin found with email ${email}`);
      process.exit(1);
    }

    admin.password = password;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    console.log(`Password reset for ${admin.username} <${admin.email}>`);

    await Admin.findByCredentials(email, password);
    console.log('✅ Login with the new password works');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetPassword();
