const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const testLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    // Test login with email
    console.log('\nTesting login with email: ahmedzekri143@gmail.com');
    try {
      const admin = await Admin.findByCredentials('ahmedzekri143@gmail.com', 'admin123456');
      console.log('✅ Login successful with email!');
      console.log('Admin:', {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName
      });
    } catch (error) {
      console.log('❌ Login failed with email:', error.message);
    }

    // Test login with username
    console.log('\nTesting login with username: ahmedzekri');
    try {
      const admin = await Admin.findByCredentials('ahmedzekri', 'admin123456');
      console.log('✅ Login successful with username!');
      console.log('Admin:', {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName
      });
    } catch (error) {
      console.log('❌ Login failed with username:', error.message);
    }

    // Test with wrong password
    console.log('\nTesting with wrong password...');
    try {
      const admin = await Admin.findByCredentials('ahmedzekri143@gmail.com', 'wrongpassword');
      console.log('✅ This should not happen!');
    } catch (error) {
      console.log('✅ Correctly rejected wrong password:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();
