const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Order Reference
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  
  // Customer Information
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  
  // Payment Details
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect'],
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['paymee', 'flouci', 'd17', 'konnect', 'stripe', 'internal'],
    default: 'internal'
  },
  
  // Transaction Information
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayTransactionId: {
    type: String,
    sparse: true
  },
  paymentReference: {
    type: String,
    unique: true,
    required: true
  },
  
  // Amounts
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'TND',
    enum: ['TND', 'USD', 'EUR']
  },
  gatewayFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  
  // Gateway Response
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  gatewayStatus: {
    type: String
  },
  gatewayMessage: {
    type: String
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  
  // Retry Information
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  },
  
  // Refund Information
  refunds: [{
    refundId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: {
      type: Date
    },
    gatewayRefundId: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Security
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Webhook Information
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Notes
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentReference: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for total refunded amount
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds
    .filter(refund => refund.status === 'completed')
    .reduce((total, refund) => total + refund.amount, 0);
});

// Virtual for remaining amount after refunds
paymentSchema.virtual('remainingAmount').get(function() {
  return this.amount - this.totalRefunded;
});

// Virtual for payment status display
paymentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'En attente',
    processing: 'En cours',
    completed: 'Terminé',
    failed: 'Échoué',
    cancelled: 'Annulé',
    refunded: 'Remboursé',
    partially_refunded: 'Partiellement remboursé'
  };
  return statusMap[this.status] || this.status;
});

// Method to check if payment can be refunded
paymentSchema.methods.canRefund = function(amount = null) {
  if (this.status !== 'completed') return false;
  
  const refundableAmount = this.remainingAmount;
  if (refundableAmount <= 0) return false;
  
  if (amount && amount > refundableAmount) return false;
  
  return true;
};

// Method to add refund
paymentSchema.methods.addRefund = function(amount, reason) {
  if (!this.canRefund(amount)) {
    throw new Error('Payment cannot be refunded');
  }
  
  const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  this.refunds.push({
    refundId,
    amount,
    reason,
    status: 'pending'
  });
  
  return this.save();
};

// Method to update payment status
paymentSchema.methods.updateStatus = function(status, gatewayResponse = null) {
  this.status = status;
  this.lastAttemptAt = new Date();
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
    this.gatewayStatus = gatewayResponse.status;
    this.gatewayMessage = gatewayResponse.message;
  }
  
  switch (status) {
    case 'processing':
      this.processedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      break;
    case 'failed':
      this.failedAt = new Date();
      this.attempts += 1;
      break;
  }
  
  return this.save();
};

// Static method to generate payment reference
paymentSchema.statics.generatePaymentReference = function() {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
};

// Static method to find by reference
paymentSchema.statics.findByReference = function(reference) {
  return this.findOne({ paymentReference: reference });
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(startDate, endDate) {
  const matchStage = {
    createdAt: {
      $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      $lte: endDate || new Date()
    }
  };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  const methodBreakdown = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return {
    summary: stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      failedPayments: 0,
      averageAmount: 0
    },
    methodBreakdown: methodBreakdown.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount
      };
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
