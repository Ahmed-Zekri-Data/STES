const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Builds the Express app without connecting to MongoDB or listening, so
// tests can create their own instance. server.js does both for real runs.
const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Placeholder images are cached by browsers and cheap to serve; keep them
  // outside the API rate limit so a page full of products can't exhaust it
  app.use('/api/placeholder', require('./routes/placeholder'));

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

  // Routes
  app.use('/api/products', require('./routes/products'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/forms', require('./routes/forms'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/admin/categories', require('./routes/adminCategories'));
  app.use('/api/admin/brands', require('./routes/adminBrands'));
  app.use('/api/admin/customers', require('./routes/adminCustomers'));
  app.use('/api/auth', require('./routes/auth')); // Admin auth
  app.use('/api/customers', require('./routes/customers')); // Customer auth and profile
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
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Error handling middleware
  // eslint-disable-next-line no-unused-vars -- Express needs the 4-argument signature
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

  return app;
};

module.exports = createApp;
