const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'ahmedzekri143@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists with email: ahmedzekri143@gmail.com');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new Admin({
      username: 'ahmedzekri',
      email: 'ahmedzekri143@gmail.com',
      password: 'admin123456', // This will be hashed automatically
      firstName: 'Ahmed',
      lastName: 'Zekri',
      role: 'super_admin',
      permissions: ['products', 'orders', 'forms', 'users', 'settings'],
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: ahmedzekri143@gmail.com');
    console.log('Password: admin123456');
    console.log('Role: super_admin');

    // Also create a default admin for backward compatibility
    const defaultAdmin = await Admin.findOne({ username: 'admin' });
    if (!defaultAdmin) {
      const defaultAdminUser = new Admin({
        username: 'admin',
        email: 'admin@piscinefacile.tn',
        password: 'admin123456',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        permissions: ['products', 'orders', 'forms', 'users', 'settings'],
        isActive: true
      });

      await defaultAdminUser.save();
      console.log('Default admin user also created for backward compatibility');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
