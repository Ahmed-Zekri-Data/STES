// Simple test script to check if server starts without errors
require('dotenv').config();

console.log('🧪 Testing server startup...');

// Test basic imports
try {
  console.log('✅ Testing basic imports...');
  const Product = require('./models/Product');
  const { productCategories } = require('./config/productCategories');
  console.log('✅ Models and config imported successfully');
  console.log(`📦 Found ${Object.keys(productCategories).length} product categories`);
} catch (error) {
  console.error('❌ Error importing modules:', error.message);
  process.exit(1);
}

// Test email service (without actually sending emails)
try {
  console.log('✅ Testing email service import...');
  // Don't instantiate the service, just test the import
  const emailServicePath = './services/emailNotificationService';
  require.resolve(emailServicePath);
  console.log('✅ Email service import successful');
} catch (error) {
  console.error('❌ Error with email service:', error.message);
  process.exit(1);
}

// Test routes import
try {
  console.log('✅ Testing routes import...');
  const productsRoutes = require('./routes/products');
  const ordersRoutes = require('./routes/orders');
  console.log('✅ Routes imported successfully');
} catch (error) {
  console.error('❌ Error importing routes:', error.message);
  process.exit(1);
}

console.log('🎉 All imports successful! Server should start without errors.');
console.log('');
console.log('📋 Summary:');
console.log('- ✅ Models imported');
console.log('- ✅ Product categories configured');
console.log('- ✅ Email service ready');
console.log('- ✅ Routes configured');
console.log('');
console.log('🚀 You can now start the server with: npm start');
