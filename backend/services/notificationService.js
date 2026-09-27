const emailNotificationService = require('./emailNotificationService');
const smsService = require('./smsService');
const pushNotificationService = require('./pushNotificationService');
const { NotificationPreferences, NotificationLog } = require('../models/Notification');

// Order statuses the customer is emailed about. "En attente" and "En
// préparation" follow closely on the order and its confirmation: no email.
const EMAILED_STATUSES = ['confirmed', 'shipped', 'delivered', 'cancelled'];

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée'
};

class NotificationService {
  constructor() {
    this.channels = {
      email: emailNotificationService,
      sms: smsService,
      push: pushNotificationService
    };
  }

  // Send notification through multiple channels
  async sendNotification(customerId, notification, channels = ['email', 'push', 'sms']) {
    try {
      // Get customer preferences
      const preferences = await NotificationPreferences.getOrCreateForCustomer(customerId);
      
      // Quiet hours hold back texts and push messages that aren't urgent; an
      // email waits in the inbox, so it is still sent
      const quiet = notification.priority !== 'urgent' && preferences.isInQuietHours();

      const results = {};
      const logs = [];

      // Send through each requested channel
      for (const channel of channels) {
        if (quiet && channel !== 'email') {
          results[channel] = { success: false, reason: 'quiet_hours' };
          continue;
        }
        if (!preferences.canReceiveNotification(channel, notification.category)) {
          results[channel] = {
            success: false,
            reason: 'disabled_by_preference',
            message: `${channel} notifications disabled for ${notification.category}`
          };
          continue;
        }

        try {
          let result;
          
          switch (channel) {
            case 'email':
              result = await this.sendEmailNotification(customerId, notification);
              break;
            case 'sms':
              result = await this.sendSMSNotification(customerId, notification);
              break;
            case 'push':
              result = await this.sendPushNotification(customerId, notification);
              break;
            default:
              result = { success: false, error: `Unknown channel: ${channel}` };
          }

          results[channel] = result;

          // Log the notification attempt
          const log = new NotificationLog({
            customer: customerId,
            order: notification.orderId,
            type: channel,
            category: notification.category,
            title: notification.title,
            message: notification.message || notification.body,
            status: result.success ? 'sent' : 'failed',
            sentAt: result.success ? new Date() : undefined,
            failureReason: result.success ? undefined : result.error,
            metadata: {
              result: result,
              notification: notification
            },
            priority: notification.priority || 'normal'
          });

          logs.push(log);

        } catch (error) {
          console.error(`Error sending ${channel} notification:`, error);
          results[channel] = {
            success: false,
            error: error.message
          };

          // Log the error
          const log = new NotificationLog({
            customer: customerId,
            order: notification.orderId,
            type: channel,
            category: notification.category,
            title: notification.title,
            message: notification.message || notification.body,
            status: 'failed',
            failureReason: error.message,
            priority: notification.priority || 'normal'
          });

          logs.push(log);
        }
      }

      // Save all logs
      if (logs.length > 0) {
        await NotificationLog.insertMany(logs);
      }

      // Determine overall success
      const successfulChannels = Object.keys(results).filter(channel => results[channel].success);
      const overallSuccess = successfulChannels.length > 0;

      return {
        success: overallSuccess,
        results,
        successfulChannels,
        totalChannels: channels.length,
        logs: logs.map(log => log._id)
      };

    } catch (error) {
      console.error('Error in notification service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send email notification
  async sendEmailNotification(customerId, notification) {
    if (notification.orderId) {
      // For order-related notifications, use the existing email service
      const Order = require('../models/Order');
      const order = await Order.findById(notification.orderId);

      if (order && ['order_update', 'delivery'].includes(notification.category)) {
        return await emailNotificationService.sendOrderStatusUpdate(order, { note: notification.note });
      }
    }

    // For other notifications, we would implement a generic email sender
    return {
      success: false,
      error: 'Generic email notifications not implemented yet'
    };
  }

  // Send SMS notification
  async sendSMSNotification(customerId, notification) {
    try {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(customerId);
      
      if (!customer || !customer.phone) {
        return {
          success: false,
          error: 'Customer phone number not found'
        };
      }

      let message;
      if (notification.orderId && notification.category === 'order_update') {
        const Order = require('../models/Order');
        const order = await Order.findById(notification.orderId);
        message = smsService.generateOrderUpdateMessage(order, notification.status);
      } else {
        message = notification.message || notification.body;
      }

      return await smsService.sendSMS(customer.phone, message);

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send push notification
  async sendPushNotification(customerId, notification) {
    try {
      let pushNotification;
      
      if (notification.orderId && notification.category === 'order_update') {
        const Order = require('../models/Order');
        const order = await Order.findById(notification.orderId);
        pushNotification = pushNotificationService.generateOrderUpdateNotification(order, notification.status);
      } else {
        pushNotification = {
          title: notification.title,
          body: notification.body || notification.message,
          icon: notification.icon,
          data: notification.data || {},
          tag: notification.tag,
          requireInteraction: notification.requireInteraction || false
        };
      }

      return await pushNotificationService.sendToCustomer(customerId, pushNotification);

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Tells the customer their order changed status: by email (for the
  // statuses in EMAILED_STATUSES), push and SMS for account holders, as their
  // notification settings allow; by email only for guest orders.
  async notifyOrderStatusChange(order, previousStatus, { note } = {}) {
    if (order.status === previousStatus) {
      return { success: false, reason: 'status_unchanged' };
    }
    const emailed = EMAILED_STATUSES.includes(order.status);

    if (!order.customerId) {
      return emailed
        ? emailNotificationService.sendOrderStatusUpdate(order, { note })
        : { success: false, reason: 'not_emailed' };
    }

    const notification = {
      orderId: order._id,
      category: order.status === 'delivered' ? 'delivery' : 'order_update',
      title: `Commande ${order.orderNumber} : ${STATUS_LABELS[order.status] || order.status}`,
      message: note || `Votre commande est maintenant : ${(STATUS_LABELS[order.status] || order.status).toLowerCase()}.`,
      status: order.status,
      previousStatus,
      note,
      priority: order.status === 'delivered' ? 'high' : 'normal'
    };
    const channels = emailed ? ['email', 'push', 'sms'] : ['push', 'sms'];
    return this.sendNotification(order.customerId, notification, channels);
  }

  // Send promotional notification
  async sendPromotionalNotification(customerId, promotion, channels = ['email', 'push']) {
    const notification = {
      category: 'promotion',
      title: promotion.title,
      message: promotion.message,
      data: promotion.data || {},
      priority: 'low'
    };

    return await this.sendNotification(customerId, notification, channels);
  }

  // Get notification history for customer
  async getNotificationHistory(customerId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      status
    } = options;

    const filter = { customer: customerId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const notifications = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('order', 'orderNumber status');

    const total = await NotificationLog.countDocuments(filter);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get notification statistics
  async getNotificationStats(customerId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await NotificationLog.aggregate([
      {
        $match: {
          customer: customerId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          total: { $sum: '$count' },
          sent: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'sent'] }, '$count', 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'failed'] }, '$count', 0]
            }
          }
        }
      }
    ]);

    return stats;
  }

  // Test all notification channels
  async testAllChannels(customerId) {
    const testNotification = {
      category: 'test',
      title: 'Test de notification STES',
      message: 'Ceci est un test de notification depuis STES Piscines',
      priority: 'low'
    };

    return await this.sendNotification(customerId, testNotification, ['email', 'push', 'sms']);
  }
}

module.exports = new NotificationService();
