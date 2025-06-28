const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const resetPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    // Find the admin
    const admin = await Admin.findOne({ email: 'ahmedzekri143@gmail.com' });
    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    console.log('Found admin:', {
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    // Reset password
    admin.password = 'admin123456';
    await admin.save();

    console.log('Password reset successfully!');

    // Test the login immediately
    console.log('\nTesting login...');
    try {
      const testAdmin = await Admin.findByCredentials('ahmedzekri143@gmail.com', 'admin123456');
      console.log('✅ Login test successful!');
    } catch (error) {
      console.log('❌ Login test failed:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetPassword();
