const mongoose = require('mongoose');

// The "Conseils" articles (/conseils/<slug>): practical guides written in the
// admin (Admin → Guides) that bring visitors from Google and lead to the
// products they need. Shown only once published.
const THEMES = ['entretien', 'problemes', 'equipement', 'construction', 'saison'];

const guideSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, trim: true, maxlength: 110 },
  // Under the title, on the list, and in Google's results
  summary: { type: String, required: true, trim: true, maxlength: 160 },
  theme: { type: String, enum: THEMES, required: true },
  image: { type: String, trim: true },
  // HTML, cleaned when saved (utils/html.js)
  body: { type: String, required: true },
  // Products recommended at the end: "<id>" or "<id>:<version code>"
  products: [{ type: String }],
  published: { type: Boolean, default: false },
  publishedAt: Date
}, {
  timestamps: true
});

guideSchema.index({ published: 1, publishedAt: -1 });

module.exports = mongoose.model('Guide', guideSchema);
module.exports.THEMES = THEMES;
