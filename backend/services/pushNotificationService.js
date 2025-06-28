const webpush = require('web-push');
const { NotificationPreferences } = require('../models/Notification');
require('dotenv').config();

class PushNotificationService {
  constructor() {
    this.vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    this.vapidDetails = {
      subject: process.env.VAPID_SUBJECT || 'mailto:contact@stes.tn',
      publicKey: this.vapidKeys.publicKey,
      privateKey: this.vapidKeys.privateKey
    };

    // Configure web-push
    if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
      webpush.setVapidDetails(
        this.vapidDetails.subject,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
      console.log('VAPID keys configured successfully');
    }

    this.isConfigured = !!(this.vapidKeys.publicKey && this.vapidKeys.privateKey);
  }

  // Generate VAPID keys (run once during setup)
  generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }

  // Subscribe a customer to push notifications
  async subscribe(customerId, subscription) {
    try {
      const preferences = await NotificationPreferences.getOrCreateForCustomer(customerId);
      
      // Check if subscription already exists
      const existingIndex = preferences.pushSubscriptions.findIndex(
        sub => sub.endpoint === subscription.endpoint
      );

      if (existingIndex >= 0) {
        // Update existing subscription
        preferences.pushSubscriptions[existingIndex] = {
          ...subscription,
          lastUsed: new Date(),
          isActive: true
        };
      } else {
        // Add new subscription
        preferences.pushSubscriptions.push({
          ...subscription,
          lastUsed: new Date(),
          isActive: true
        });
      }

      // Enable push notifications
      preferences.push.enabled = true;
      await preferences.save();

      return {
        success: true,
        message: 'Successfully subscribed to push notifications'
      };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(customerId, endpoint) {
    try {
      const preferences = await NotificationPreferences.findOne({ customer: customerId });
      
      if (!preferences) {
        return { success: false, error: 'No preferences found' };
      }

      // Remove the subscription
      preferences.pushSubscriptions = preferences.pushSubscriptions.filter(
        sub => sub.endpoint !== endpoint
      );

      // If no subscriptions left, disable push notifications
      if (preferences.pushSubscriptions.length === 0) {
        preferences.push.enabled = false;
      }

      await preferences.save();

      return {
        success: true,
        message: 'Successfully unsubscribed from push notifications'
      };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send push notification to a specific customer
  async sendToCustomer(customerId, notification) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Push notifications not configured (missing VAPID keys)'
      };
    }

    try {
      const preferences = await NotificationPreferences.findOne({ customer: customerId });
      
      if (!preferences || !preferences.push.enabled || preferences.pushSubscriptions.length === 0) {
        return {
          success: false,
          error: 'Customer not subscribed to push notifications'
        };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        image: notification.image,
        data: notification.data || {},
        actions: notification.actions || [],
        tag: notification.tag,
        requireInteraction: notification.requireInteraction || false,
        silent: notification.silent || false
      });

      const options = {
        TTL: notification.ttl || 86400, // 24 hours default
        urgency: notification.urgency || 'normal', // low, normal, high
        topic: notification.topic
      };

      const results = [];
      const activeSubscriptions = [];

      // Send to all active subscriptions
      for (const subscription of preferences.pushSubscriptions) {
        if (!subscription.isActive) continue;

        try {
          const result = await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            payload,
            options
          );

          results.push({
            endpoint: subscription.endpoint,
            success: true,
            statusCode: result.statusCode
          });

          // Update last used
          subscription.lastUsed = new Date();
          activeSubscriptions.push(subscription);

        } catch (error) {
          console.error('Push notification failed for endpoint:', subscription.endpoint, error);
          
          results.push({
            endpoint: subscription.endpoint,
            success: false,
            error: error.message,
            statusCode: error.statusCode
          });

          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            subscription.isActive = false;
          }
        }
      }

      // Update preferences with active subscriptions
      preferences.pushSubscriptions = preferences.pushSubscriptions.map(sub => {
        const updated = activeSubscriptions.find(active => active.endpoint === sub.endpoint);
        return updated || sub;
      });

      await preferences.save();

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      return {
        success: successCount > 0,
        results,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        }
      };

    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send push notification to multiple customers
  async sendToMultiple(customerIds, notification) {
    const results = [];

    for (const customerId of customerIds) {
      const result = await this.sendToCustomer(customerId, notification);
      results.push({
        customerId,
        ...result
      });
    }

    return results;
  }

  // Generate order update push notification
  generateOrderUpdateNotification(order, status) {
    const statusConfig = {
      confirmed: {
        title: '✅ Commande confirmée',
        body: `Votre commande ${order.orderNumber} a été confirmée`,
        icon: '/icons/order-confirmed.png',
        tag: `order-${order.orderNumber}`,
        data: { orderId: order._id, orderNumber: order.orderNumber, action: 'view_order' }
      },
      processing: {
        title: '📦 Commande en préparation',
        body: `Votre commande ${order.orderNumber} est en cours de préparation`,
        icon: '/icons/order-processing.png',
        tag: `order-${order.orderNumber}`,
        data: { orderId: order._id, orderNumber: order.orderNumber, action: 'track_order' }
      },
      shipped: {
        title: '🚚 Commande expédiée',
        body: `Votre commande ${order.orderNumber} a été expédiée`,
        icon: '/icons/order-shipped.png',
        tag: `order-${order.orderNumber}`,
        requireInteraction: true,
        data: { orderId: order._id, orderNumber: order.orderNumber, trackingCode: order.trackingCode, action: 'track_order' }
      },
      delivered: {
        title: '🎉 Commande livrée',
        body: `Votre commande ${order.orderNumber} a été livrée avec succès!`,
        icon: '/icons/order-delivered.png',
        tag: `order-${order.orderNumber}`,
        requireInteraction: true,
        data: { orderId: order._id, orderNumber: order.orderNumber, action: 'rate_order' },
        actions: [
          {
            action: 'rate',
            title: 'Évaluer',
            icon: '/icons/star.png'
          },
          {
            action: 'view',
            title: 'Voir détails',
            icon: '/icons/view.png'
          }
        ]
      }
    };

    return statusConfig[status] || {
      title: 'Mise à jour de commande',
      body: `Votre commande ${order.orderNumber} a été mise à jour`,
      icon: '/icons/notification.png',
      tag: `order-${order.orderNumber}`,
      data: { orderId: order._id, orderNumber: order.orderNumber, action: 'view_order' }
    };
  }

  // Clean up inactive subscriptions
  async cleanupInactiveSubscriptions() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      const result = await NotificationPreferences.updateMany(
        {},
        {
          $pull: {
            pushSubscriptions: {
              $or: [
                { isActive: false },
                { lastUsed: { $lt: cutoffDate } }
              ]
            }
          }
        }
      );

      console.log(`Cleaned up inactive push subscriptions: ${result.modifiedCount} preferences updated`);
      return result;
    } catch (error) {
      console.error('Error cleaning up inactive subscriptions:', error);
      return { error: error.message };
    }
  }

  // Test push notification configuration
  async testConfiguration() {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Push notifications not configured. Please set VAPID keys in environment variables.'
      };
    }

    return {
      success: true,
      message: 'Push notification service is properly configured',
      vapidPublicKey: this.vapidKeys.publicKey
    };
  }

  // Get VAPID public key for frontend
  getVapidPublicKey() {
    return this.vapidKeys.publicKey;
  }
}

module.exports = new PushNotificationService();
