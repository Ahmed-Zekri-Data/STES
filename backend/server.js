const mongoose = require('mongoose');
require('./config/env');

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env at the repository root and set it.');
  process.exit(1);
}

const createApp = require('./app');
const { ensureProductCategoriesExist } = require('./services/categoryService');
const { ensureProductBrandsExist } = require('./services/brandService');
const { startReminderSchedule } = require('./services/maintenanceService');

const app = createApp();

// MongoDB connection. When the database cannot be reached at start (it
// starts after this server, or the network is down), try again every few
// seconds instead of running without it: /api/health answers 503 until
// then. Once connected, the driver reconnects on its own.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce';
const RETRY_SECONDS = 5;

const onConnected = () => {
  console.log('✅ Successfully connected to MongoDB');
  console.log('📊 Database:', mongoose.connection.name);

  // Pool care reminders go out by email every morning
  startReminderSchedule();

  // Shops upgrading from the fixed category list get a category for each
  // one their products use, so the admin and the shop can show them
  ensureProductCategoriesExist()
    .then(created => {
      if (created.length) console.log(`📂 Created categories used by products: ${created.join(', ')}`);
    })
    .catch(error => console.error('Could not check product categories:', error.message));

  // Likewise for the brands products already name
  ensureProductBrandsExist()
    .then(created => {
      if (created.length) console.log(`🏷️  Created brands used by products: ${created.join(', ')}`);
    })
    .catch(error => console.error('Could not check product brands:', error.message));
};

const connect = () => {
  console.log('🔄 Attempting to connect to MongoDB...');
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: RETRY_SECONDS * 1000 })
    .then(onConnected)
    .catch((error) => {
      console.error(`❌ MongoDB connection error: ${error.message}. Trying again in ${RETRY_SECONDS} s.`);
      setTimeout(connect, RETRY_SECONDS * 1000);
    });
};
connect();

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log('\n🚀 STES Backend Server Started Successfully!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
