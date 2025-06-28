const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const paymentService = require('../services/paymentService');
const { customerAuth, optionalCustomerAuth } = require('../middleware/customerAuth');

// GET /api/payments/methods - Get available payment methods
router.get('/methods', async (req, res) => {
  try {
    const methods = paymentService.getAvailablePaymentMethods();
    res.json({ methods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
});

// POST /api/payments/initiate - Initiate payment for an order
router.post('/initiate', [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('paymentMethod').isIn(['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect'])
    .withMessage('Valid payment method is required'),
  body('customerInfo').isObject().withMessage('Customer information is required'),
  body('customerInfo.firstName').notEmpty().withMessage('First name is required'),
  body('customerInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('customerInfo.email').isEmail().withMessage('Valid email is required'),
  body('customerInfo.phone').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentMethod, customerInfo } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order already has a completed payment
    const existingPayment = await Payment.findOne({
      orderId,
      status: { $in: ['completed', 'processing'] }
    });

    if (existingPayment) {
      return res.status(400).json({ 
        message: 'Order already has a payment in progress or completed' 
      });
    }

    // Get client metadata
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    // Initiate payment
    const paymentResult = await paymentService.initiatePayment(
      order,
      paymentMethod,
      customerInfo,
      metadata
    );

    res.json(paymentResult);
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ 
      message: 'Error initiating payment',
      error: error.message 
    });
  }
});

// GET /api/payments/:paymentReference/status - Get payment status
router.get('/:paymentReference/status', [
  param('paymentReference').notEmpty().withMessage('Payment reference is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentReference } = req.params;

    const payment = await Payment.findByReference(paymentReference)
      .populate('orderId', 'orderNumber status totalAmount');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      paymentReference: payment.paymentReference,
      status: payment.status,
      statusDisplay: payment.statusDisplay,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      order: payment.orderId ? {
        orderNumber: payment.orderId.orderNumber,
        status: payment.orderId.status,
        totalAmount: payment.orderId.totalAmount
      } : null
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ message: 'Error fetching payment status' });
  }
});

// POST /api/payments/:paymentReference/verify - Verify payment with gateway
router.post('/:paymentReference/verify', [
  param('paymentReference').notEmpty().withMessage('Payment reference is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentReference } = req.params;

    const payment = await paymentService.verifyPayment(paymentReference);

    res.json({
      paymentReference: payment.paymentReference,
      status: payment.status,
      verified: true,
      verifiedAt: new Date()
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      message: 'Error verifying payment',
      error: error.message 
    });
  }
});

// GET /api/payments/customer/history - Get customer payment history (authenticated)
router.get('/customer/history', customerAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { customerId: req.customer.customerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber status totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments(query);

    const paymentsWithDetails = payments.map(payment => ({
      id: payment._id,
      paymentReference: payment.paymentReference,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      statusDisplay: payment.statusDisplay,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      order: payment.orderId ? {
        orderNumber: payment.orderId.orderNumber,
        status: payment.orderId.status,
        totalAmount: payment.orderId.totalAmount
      } : null
    }));

    res.json({
      payments: paymentsWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNextPage: page < Math.ceil(totalPayments / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// POST /api/payments/:paymentId/refund - Request refund (authenticated)
router.post('/:paymentId/refund', customerAuth, [
  param('paymentId').isMongoId().withMessage('Valid payment ID is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Valid refund amount is required'),
  body('reason').notEmpty().withMessage('Refund reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findOne({
      _id: paymentId,
      customerId: req.customer.customerId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const refundAmount = amount || payment.remainingAmount;

    if (!payment.canRefund(refundAmount)) {
      return res.status(400).json({ 
        message: 'Payment cannot be refunded or refund amount exceeds available amount' 
      });
    }

    await payment.addRefund(refundAmount, reason);

    res.json({
      message: 'Refund request submitted successfully',
      refundAmount,
      remainingAmount: payment.remainingAmount - refundAmount
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({ 
      message: 'Error requesting refund',
      error: error.message 
    });
  }
});

// Webhook endpoints for payment gateways
// POST /api/payments/webhook/paymee - Paymee webhook
router.post('/webhook/paymee', async (req, res) => {
  try {
    const { payment_id, status, order_id } = req.body;

    const payment = await Payment.findOne({
      paymentReference: order_id,
      gatewayTransactionId: payment_id
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status based on Paymee status
    let newStatus = 'pending';
    if (status === 'paid') {
      newStatus = 'completed';
    } else if (status === 'failed' || status === 'cancelled') {
      newStatus = 'failed';
    }

    await payment.updateStatus(newStatus, req.body);
    payment.webhookReceived = true;
    payment.webhookData = req.body;
    await payment.save();

    // Update order status if payment completed
    if (newStatus === 'completed') {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        await order.save();
      }
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Paymee webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// POST /api/payments/webhook/flouci - Flouci webhook
router.post('/webhook/flouci', async (req, res) => {
  try {
    const { payment_id, status, developer_tracking_id } = req.body;

    const payment = await Payment.findOne({
      paymentReference: developer_tracking_id,
      gatewayTransactionId: payment_id
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status based on Flouci status
    let newStatus = 'pending';
    if (status === 'SUCCESS') {
      newStatus = 'completed';
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      newStatus = 'failed';
    }

    await payment.updateStatus(newStatus, req.body);
    payment.webhookReceived = true;
    payment.webhookData = req.body;
    await payment.save();

    // Update order status if payment completed
    if (newStatus === 'completed') {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        await order.save();
      }
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Flouci webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// GET /api/payments/stats - Get payment statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await Payment.getPaymentStats(start, end);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Error fetching payment statistics' });
  }
});

module.exports = router;
