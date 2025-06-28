const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['contact', 'quote', 'newsletter'],
    default: 'contact'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  message: {
    type: String,
    required: function() {
      return this.type === 'contact' || this.type === 'quote';
    },
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['website', 'mobile_app', 'api'],
    default: 'website'
  },
  language: {
    type: String,
    enum: ['fr', 'ar', 'en'],
    default: 'fr'
  },
  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  repliedAt: {
    type: Date
  },
  repliedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
formSubmissionSchema.index({ type: 1 });
formSubmissionSchema.index({ status: 1 });
formSubmissionSchema.index({ email: 1 });
formSubmissionSchema.index({ createdAt: -1 });

// Virtual for formatted creation date
formSubmissionSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to mark as read
formSubmissionSchema.methods.markAsRead = function() {
  this.status = 'read';
  return this.save();
};

// Method to mark as replied
formSubmissionSchema.methods.markAsReplied = function(repliedBy) {
  this.status = 'replied';
  this.repliedAt = new Date();
  this.repliedBy = repliedBy;
  return this.save();
};

// Static method to get unread submissions
formSubmissionSchema.statics.getUnread = function() {
  return this.find({ status: 'new' }).sort({ createdAt: -1 });
};

// Static method to get submissions by type
formSubmissionSchema.statics.getByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Static method to get recent submissions
formSubmissionSchema.statics.getRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
