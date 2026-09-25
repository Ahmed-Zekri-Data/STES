const mongoose = require('mongoose');
require('./config/env');

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env at the repository root and set it.');
  process.exit(1);
}

const createApp = require('./app');

const app = createApp();

// MongoDB connection
console.log('🔄 Attempting to connect to MongoDB...');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce')
.then(() => {
  console.log('✅ Successfully connected to MongoDB');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check if MongoDB service is running: net start MongoDB');
  console.log('2. Verify MongoDB is installed and accessible');
  console.log('3. Check if port 27017 is available');
  console.log('4. Try connecting with: mongosh');
  console.log('\n⚠️  Server will continue without database functionality');
});

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log('\n🚀 STES Backend Server Started Successfully!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
