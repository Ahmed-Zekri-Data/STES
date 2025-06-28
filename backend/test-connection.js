const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Database connection successful!');

    // Test Customer model
    try {
      const Customer = require('./models/Customer');
      console.log('✅ Customer model loaded successfully!');

      // Test if we can query customers
      const customerCount = await Customer.countDocuments();
      console.log(`📊 Found ${customerCount} customers in database`);

      // Test basic customer operations
      console.log('🔄 Testing customer operations...');

      // Try to find a customer (should not throw error even if none exist)
      const testCustomer = await Customer.findOne();
      if (testCustomer) {
        console.log(`✅ Sample customer found: ${testCustomer.email}`);
      } else {
        console.log('ℹ️  No customers found (this is normal for a fresh database)');
      }

    } catch (modelError) {
      console.error('❌ Customer model error:', modelError.message);
      throw modelError;
    }

    console.log('🎉 All tests passed! Backend is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

console.log('Starting backend test...');
testConnection();
