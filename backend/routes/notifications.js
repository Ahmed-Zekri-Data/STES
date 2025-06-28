const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { customerAuth } = require('../middleware/customerAuth');
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const pushNotificationService = require('../services/pushNotificationService');
const smsService = require('../services/smsService');
const { NotificationPreferences, NotificationLog } = require('../models/Notification');

// GET /api/notifications/vapid-public-key - Get VAPID public key for push notifications
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    
    if (!publicKey) {
      return res.status(503).json({ 
        message: 'Push notifications not configured' 
      });
    }

    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ message: 'Error getting VAPID public key' });
  }
});

// GET /api/notifications/preferences - Get customer notification preferences
router.get('/preferences', customerAuth, async (req, res) => {
  try {
    const preferences = await NotificationPreferences.getOrCreateForCustomer(req.customer.customerId);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Error fetching notification preferences' });
  }
});

// PUT /api/notifications/preferences - Update customer notification preferences
router.put('/preferences', customerAuth, [
  body('email.enabled').optional().isBoolean(),
  body('email.orderUpdates').optional().isBoolean(),
  body('email.deliveryUpdates').optional().isBoolean(),
  body('email.promotions').optional().isBoolean(),
  body('email.newsletter').optional().isBoolean(),
  body('sms.enabled').optional().isBoolean(),
  body('sms.orderUpdates').optional().isBoolean(),
  body('sms.deliveryUpdates').optional().isBoolean(),
  body('sms.urgentOnly').optional().isBoolean(),
  body('push.enabled').optional().isBoolean(),
  body('push.orderUpdates').optional().isBoolean(),
  body('push.deliveryUpdates').optional().isBoolean(),
  body('push.promotions').optional().isBoolean(),
  body('push.inApp').optional().isBoolean(),
  body('quietHours.enabled').optional().isBoolean(),
  body('quietHours.start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('quietHours.end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const preferences = await NotificationPreferences.getOrCreateForCustomer(req.customer.customerId);
    
    // Update preferences
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        Object.keys(updates[key]).forEach(subKey => {
          if (preferences[key] && preferences[key][subKey] !== undefined) {
            preferences[key][subKey] = updates[key][subKey];
          }
        });
      } else if (preferences[key] !== undefined) {
        preferences[key] = updates[key];
      }
    });

    await preferences.save();
    res.json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Error updating notification preferences' });
  }
});

// POST /api/notifications/push/subscribe - Subscribe to push notifications
router.post('/push/subscribe', customerAuth, [
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').isURL().withMessage('Valid endpoint URL is required'),
  body('subscription.keys').isObject().withMessage('Keys object is required'),
  body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key is required'),
  body('subscription.keys.auth').notEmpty().withMessage('auth key is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subscription } = req.body;
    const result = await pushNotificationService.subscribe(req.customer.customerId, subscription);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.error });
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ message: 'Error subscribing to push notifications' });
  }
});

// POST /api/notifications/push/unsubscribe - Unsubscribe from push notifications
router.post('/push/unsubscribe', customerAuth, [
  body('endpoint').isURL().withMessage('Valid endpoint URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { endpoint } = req.body;
    const result = await pushNotificationService.unsubscribe(req.customer.customerId, endpoint);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.error });
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ message: 'Error unsubscribing from push notifications' });
  }
});

// GET /api/notifications/history - Get notification history
router.get('/history', customerAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['email', 'sms', 'push', 'in-app']),
  query('category').optional().isIn(['order_update', 'delivery', 'promotion', 'newsletter', 'reminder', 'welcome']),
  query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'read'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
      category: req.query.category,
      status: req.query.status
    };

    const result = await notificationService.getNotificationHistory(req.customer.customerId, options);
    res.json(result);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ message: 'Error fetching notification history' });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', customerAuth, [
  query('days').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const days = parseInt(req.query.days) || 30;
    const stats = await notificationService.getNotificationStats(req.customer.customerId, days);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Error fetching notification stats' });
  }
});

// POST /api/notifications/test - Test all notification channels
router.post('/test', customerAuth, async (req, res) => {
  try {
    const result = await notificationService.testAllChannels(req.customer.customerId);
    res.json(result);
  } catch (error) {
    console.error('Error testing notification channels:', error);
    res.status(500).json({ message: 'Error testing notification channels' });
  }
});

// Admin routes

// POST /api/notifications/admin/send - Send notification to specific customer (Admin only)
router.post('/admin/send', auth, [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('notification').isObject().withMessage('Notification object is required'),
  body('notification.title').notEmpty().withMessage('Notification title is required'),
  body('notification.message').notEmpty().withMessage('Notification message is required'),
  body('notification.category').isIn(['order_update', 'delivery', 'promotion', 'newsletter', 'reminder', 'welcome']),
  body('channels').optional().isArray().withMessage('Channels must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, notification, channels = ['email', 'push'] } = req.body;
    const result = await notificationService.sendNotification(customerId, notification, channels);
    res.json(result);
  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ message: 'Error sending notification' });
  }
});

// GET /api/notifications/admin/logs - Get all notification logs (Admin only)
router.get('/admin/logs', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('customerId').optional().isMongoId(),
  query('type').optional().isIn(['email', 'sms', 'push', 'in-app']),
  query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'read'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 50,
      customerId,
      type,
      status
    } = req.query;

    const filter = {};
    if (customerId) filter.customer = customerId;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('customer', 'firstName lastName email')
      .populate('order', 'orderNumber status');

    const total = await NotificationLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    res.status(500).json({ message: 'Error fetching notification logs' });
  }
});

// GET /api/notifications/admin/test-config - Test notification configuration (Admin only)
router.get('/admin/test-config', auth, async (req, res) => {
  try {
    const results = {
      push: await pushNotificationService.testConfiguration(),
      sms: await smsService.testConfiguration()
    };

    res.json(results);
  } catch (error) {
    console.error('Error testing notification configuration:', error);
    res.status(500).json({ message: 'Error testing notification configuration' });
  }
});

module.exports = router;
