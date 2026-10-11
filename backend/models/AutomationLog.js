const mongoose = require('mongoose');

// One line per automatic email sent, for the counts in Admin → Settings →
// Marketing. Kept 90 days.
const automationLogSchema = new mongoose.Schema({
  automation: {
    type: String,
    enum: ['abandoned_cart', 'quote_alert', 'quote_follow_up', 'review_request', 'replenishment'],
    required: true
  },
  email: { type: String, lowercase: true, trim: true },
  at: { type: Date, default: Date.now, expires: 90 * 24 * 3600 }
});

automationLogSchema.index({ automation: 1, at: -1 });

module.exports = mongoose.model('AutomationLog', automationLogSchema);
