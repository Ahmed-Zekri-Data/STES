const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB connection...');
console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB');
  process.exit(0);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.log('\n📝 Possible solutions:');
  console.log('1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
  console.log('2. Start MongoDB service: net start MongoDB (Windows) or brew services start mongodb/brew/mongodb-community (Mac)');
  console.log('3. Use MongoDB Atlas (cloud): https://cloud.mongodb.com/');
  process.exit(1);
});
