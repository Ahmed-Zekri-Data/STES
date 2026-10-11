const mongoose = require('mongoose');

// A checkout started and not finished: saved when the customer gives their
// email (first step), so the shop can send one reminder with a link that
// fills the cart again. Also used for the "order again" links of the
// replenishment emails (kind "reorder"). Deleted after 30 days.
const checkoutDraftSchema = new mongoose.Schema({
  // The browser's id for this checkout (several saves update one draft)
  draftId: { type: String, required: true, unique: true },
  // In the email's link: random, so links cannot be guessed
  token: { type: String, required: true, unique: true },
  kind: { type: String, enum: ['checkout', 'reorder'], default: 'checkout' },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: { type: String, trim: true, maxlength: 50 },
  items: [{
    _id: false,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: String, maxlength: 40 },
    quantity: { type: Number, min: 1, max: 999, required: true }
  }],
  // The customer asked for no reminder at checkout
  reminders: { type: Boolean, default: true },
  remindedAt: Date,
  // An order was placed with this email afterwards
  convertedAt: Date
}, {
  timestamps: true
});

checkoutDraftSchema.index({ email: 1, convertedAt: 1 });
checkoutDraftSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('CheckoutDraft', checkoutDraftSchema);
