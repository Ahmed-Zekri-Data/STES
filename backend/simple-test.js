console.log('Starting simple test...');

try {
  console.log('Testing basic Node.js functionality...');
  
  // Test basic requires
  const mongoose = require('mongoose');
  console.log('✅ Mongoose loaded successfully');
  
  const bcrypt = require('bcryptjs');
  console.log('✅ bcryptjs loaded successfully');
  
  const jwt = require('jsonwebtoken');
  console.log('✅ jsonwebtoken loaded successfully');
  
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  // Test environment variables
  require('dotenv').config();
  console.log('✅ dotenv loaded successfully');
  console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
  
  // Test basic MongoDB connection
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    
    // Test Customer model loading
    try {
      const Customer = require('./models/Customer');
      console.log('✅ Customer model loaded successfully!');
      
      // Test basic operations
      Customer.countDocuments()
        .then(count => {
          console.log(`📊 Customer count: ${count}`);
          console.log('🎉 All tests passed!');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Error counting customers:', err.message);
          process.exit(1);
        });
        
    } catch (modelError) {
      console.error('❌ Error loading Customer model:', modelError.message);
      console.error('Stack:', modelError.stack);
      process.exit(1);
    }
    
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Basic test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
