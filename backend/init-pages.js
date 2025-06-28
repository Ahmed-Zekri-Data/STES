const mongoose = require('mongoose');
const Page = require('./models/Page');

async function initializePages() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/stes-ecommerce');
    console.log('✅ Connected to MongoDB');

    // Initialize default pages
    await Page.initializeDefaultPages();
    console.log('✅ Default pages initialized successfully');

    // List all pages
    const pages = await Page.find({});
    console.log('\n📄 Pages in database:');
    pages.forEach(page => {
      console.log(`- ${page.slug}: ${page.title} (${page.isActive ? 'Active' : 'Inactive'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

initializePages();
