const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  // Reference to Customer model (for authenticated users)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  // Customer information (for both authenticated and guest users)
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    address: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      postalCode: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        default: 'Tunisia',
        trim: true
      }
    }
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect'],
    default: 'cash_on_delivery'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: {
      type: String,
      sparse: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    paymentDate: {
      type: Date
    },
    paymentAmount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'TND'
    },
    gatewayFee: {
      type: Number,
      default: 0,
      min: 0
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundReason: {
      type: String
    },
    paymentAttempts: {
      type: Number,
      default: 0
    },
    lastPaymentAttempt: {
      type: Date
    }
  },
  // Billing Information
  billing: {
    sameAsShipping: {
      type: Boolean,
      default: true
    },
    firstName: String,
    lastName: String,
    company: String,
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Tunisia'
    },
    phone: String,
    email: String
  },

  // Pricing Breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 0.19, // 19% VAT in Tunisia
      min: 0,
      max: 1
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountCode: String,
    paymentFee: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },

  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 500
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  // Enhanced tracking features
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      maxlength: 200
    },
    location: {
      type: String,
      maxlength: 100
    },
    updatedBy: {
      type: String,
      default: 'system'
    },
    adminName: {
      type: String
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  }],
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  shippingProvider: {
    name: {
      type: String,
      default: 'STES Livraison'
    },
    trackingUrl: {
      type: String
    },
    contact: {
      type: String
    }
  },
  deliveryInstructions: {
    type: String,
    maxlength: 300
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  trackingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  // Email notification settings
  emailNotifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    statusUpdates: {
      type: Boolean,
      default: true
    },
    deliveryUpdates: {
      type: Boolean,
      default: true
    },
    lastNotificationSent: {
      type: Date
    }
  },
  // Internal notes for admin
  internalNotes: [{
    note: {
      type: String,
      required: true,
      maxlength: 500
    },
    addedBy: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ trackingCode: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ estimatedDelivery: 1 });

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `${this.totalAmount.toFixed(2)} TND`;
});

// Pre-save middleware to generate order number and tracking code
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;

    // Generate unique tracking code
    this.trackingCode = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Initialize status history
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date(),
      note: 'Commande créée',
      location: 'STES - Centre de traitement',
      updatedBy: 'system'
    }];

    // Set estimated delivery (3-5 business days from now)
    const deliveryDays = this.isUrgent ? 2 : 4;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);
    this.estimatedDelivery = estimatedDate;
  }

  // Track status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: this.getStatusNote(this.status),
      location: this.getStatusLocation(this.status),
      updatedBy: 'admin'
    });

    // Set actual delivery date when delivered
    if (this.status === 'delivered' && !this.actualDelivery) {
      this.actualDelivery = new Date();
    }
  }

  next();
});

// Method to calculate total amount
orderSchema.methods.calculateTotal = function() {
  const itemsTotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  this.totalAmount = itemsTotal + this.shippingCost;
  return this.totalAmount;
};

// Helper method to get status note
orderSchema.methods.getStatusNote = function(status) {
  const statusNotes = {
    pending: 'Commande en attente de confirmation',
    confirmed: 'Commande confirmée et en cours de préparation',
    processing: 'Commande en cours de préparation',
    shipped: 'Commande expédiée et en route',
    delivered: 'Commande livrée avec succès',
    cancelled: 'Commande annulée'
  };
  return statusNotes[status] || 'Statut mis à jour';
};

// Helper method to get status location
orderSchema.methods.getStatusLocation = function(status) {
  const statusLocations = {
    pending: 'STES - Centre de traitement',
    confirmed: 'STES - Entrepôt',
    processing: 'STES - Entrepôt',
    shipped: 'En transit',
    delivered: 'Adresse de livraison',
    cancelled: 'STES - Centre de traitement'
  };
  return statusLocations[status] || 'STES - Centre de traitement';
};

// Method to add tracking event
orderSchema.methods.addTrackingEvent = function(status, note, location, updatedBy = 'admin') {
  this.statusHistory.push({
    status: status || this.status,
    timestamp: new Date(),
    note,
    location,
    updatedBy
  });
  return this.save();
};

// Method to get tracking timeline
orderSchema.methods.getTrackingTimeline = function() {
  const allStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const timeline = [];

  allStatuses.forEach(status => {
    const historyEntry = this.statusHistory.find(h => h.status === status);
    const isCompleted = historyEntry ? true : false;
    const isCurrent = this.status === status;

    timeline.push({
      status,
      label: this.getStatusLabel(status),
      completed: isCompleted,
      current: isCurrent,
      timestamp: historyEntry?.timestamp || null,
      note: historyEntry?.note || null,
      location: historyEntry?.location || null
    });
  });

  return timeline;
};

// Helper method to get status label
orderSchema.methods.getStatusLabel = function(status) {
  const statusLabels = {
    pending: 'Commande reçue',
    confirmed: 'Confirmée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée'
  };
  return statusLabels[status] || status;
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get recent orders
orderSchema.statics.getRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit).populate('items.product');
};

// Static method to get orders by customer
orderSchema.statics.getByCustomer = function(customerId, limit = null) {
  const query = this.find({ customerId }).sort({ createdAt: -1 }).populate('items.product');
  return limit ? query.limit(limit) : query;
};

// Static method to get customer order stats
orderSchema.statics.getCustomerStats = async function(customerId) {
  const stats = await this.aggregate([
    { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  return stats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 };
};

// Static method to find order by tracking code (public access)
orderSchema.statics.findByTrackingCode = function(trackingCode) {
  return this.findOne({ trackingCode }).populate('items.product', 'name images category');
};

// Static method to find order by order number (public access)
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber }).populate('items.product', 'name images category');
};

// Static method to get orders requiring delivery updates
orderSchema.statics.getOrdersForDeliveryUpdate = function() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    status: { $in: ['shipped', 'processing'] },
    estimatedDelivery: { $lte: tomorrow }
  }).populate('items.product', 'name');
};

// Static method to get overdue orders
orderSchema.statics.getOverdueOrders = function() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return this.find({
    status: { $in: ['shipped', 'processing'] },
    estimatedDelivery: { $lt: today }
  }).populate('items.product', 'name');
};

module.exports = mongoose.model('Order', orderSchema);
