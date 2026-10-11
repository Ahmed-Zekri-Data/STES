const mongoose = require('mongoose');
require('../config/env');
const Guide = require('../models/Guide');
const DEFAULT_GUIDES = require('../config/defaultGuides');
const { cleanPageHtml } = require('../utils/html');

// Creates the first "Conseils" guides as drafts, for a technician to check
// in Admin → Guides before publishing. Guides that already exist (same
// address) are left as they are.
const initGuides = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    let created = 0;
    for (const guide of DEFAULT_GUIDES) {
      if (await Guide.exists({ slug: guide.slug })) continue;
      await Guide.create({ ...guide, body: cleanPageHtml(guide.body.trim()), published: false });
      created++;
    }
    console.log(`✅ ${created} guide${created === 1 ? '' : 's'} created as drafts (${DEFAULT_GUIDES.length - created} already there)`);
    console.log('Read and publish them in Admin → Guides.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

initGuides();
