const mongoose = require('mongoose');

// Schema for push notification subscriptions
const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userAgent: String,
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Schema for notification preferences
const notificationPreferencesSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  email: {
    enabled: {
      type: Boolean,
      default: true
    },
    orderUpdates: {
      type: Boolean,
      default: true
    },
    deliveryUpdates: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: true
    }
  },
  sms: {
    enabled: {
      type: Boolean,
      default: false
    },
    orderUpdates: {
      type: Boolean,
      default: false
    },
    deliveryUpdates: {
      type: Boolean,
      default: false
    },
    urgentOnly: {
      type: Boolean,
      default: true
    }
  },
  push: {
    enabled: {
      type: Boolean,
      default: false
    },
    orderUpdates: {
      type: Boolean,
      default: false
    },
    deliveryUpdates: {
      type: Boolean,
      default: false
    },
    promotions: {
      type: Boolean,
      default: false
    },
    inApp: {
      type: Boolean,
      default: true
    }
  },
  pushSubscriptions: [pushSubscriptionSchema],
  timezone: {
    type: String,
    default: 'Africa/Tunis'
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00'
    },
    end: {
      type: String,
      default: '08:00'
    }
  }
}, {
  timestamps: true
});

// Schema for notification history/logs
const notificationLogSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app'],
    required: true
  },
  category: {
    type: String,
    enum: ['order_update', 'delivery', 'promotion', 'newsletter', 'reminder', 'welcome'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failureReason: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationPreferencesSchema.index({ customer: 1 });
notificationLogSchema.index({ customer: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1, createdAt: -1 });
notificationLogSchema.index({ type: 1, category: 1 });

// Methods for notification preferences
notificationPreferencesSchema.methods.canReceiveNotification = function(type, category) {
  if (!this[type]?.enabled) return false;
  
  // Check specific category preferences
  switch (category) {
    case 'order_update':
      return this[type].orderUpdates;
    case 'delivery':
      return this[type].deliveryUpdates;
    case 'promotion':
      return this[type].promotions;
    case 'newsletter':
      return this[type].newsletter;
    default:
      return true;
  }
};

notificationPreferencesSchema.methods.isInQuietHours = function() {
  if (!this.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-GB', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: this.timezone 
  });
  
  const start = this.quietHours.start;
  const end = this.quietHours.end;
  
  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
};

// Static method to get or create preferences
notificationPreferencesSchema.statics.getOrCreateForCustomer = async function(customerId) {
  let preferences = await this.findOne({ customer: customerId });
  
  if (!preferences) {
    preferences = new this({ customer: customerId });
    await preferences.save();
  }
  
  return preferences;
};

// Create models
const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);
const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

module.exports = {
  NotificationPreferences,
  NotificationLog
};
