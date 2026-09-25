const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('../config/env');
const adminCredentials = require('./adminCredentials');

// Creates the first super admin from DEFAULT_ADMIN_* in .env.
const createAdminUser = async () => {
  const { username, email, password } = adminCredentials();

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.username} <${existingAdmin.email}>`);
      process.exit(0);
    }

    await Admin.create({
      username,
      email,
      password, // hashed by the model
      firstName: 'Admin',
      lastName: 'STES',
      role: 'super_admin',
      permissions: ['products', 'orders', 'forms', 'users', 'settings'],
      isActive: true
    });

    console.log(`Admin created: ${username} <${email}>`);
    console.log('Sign in with the password set in DEFAULT_ADMIN_PASSWORD.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
