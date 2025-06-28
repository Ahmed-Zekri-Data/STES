const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
console.log('🔄 Attempting to connect to MongoDB...');
console.log('📍 MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/categories', require('./routes/adminCategories'));
app.use('/api/admin/brands', require('./routes/adminBrands'));
app.use('/api/admin/customers', require('./routes/adminCustomers'));
app.use('/api/auth', require('./routes/auth')); // Admin auth
app.use('/api/customer/auth', require('./routes/customerAuth')); // Customer auth, profile, orders
app.use('/api/customers', require('./routes/customers')); // Admin managing customers
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/customer-orders', require('./routes/customerOrders'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/pages', require('./routes/pages'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log('\n🚀 STES Backend Server Started Successfully!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log('\n📋 Available API endpoints:');
  console.log('   POST /api/customers/register - Customer registration');
  console.log('   POST /api/customers/login - Customer login');
  console.log('   GET  /api/customers/me - Get customer profile');
  console.log('\n💡 If you see MongoDB connection errors above, the server will still work');
  console.log('   but authentication will not persist data.');
});
