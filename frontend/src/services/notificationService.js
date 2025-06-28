import axios from 'axios';

// Create a simple API instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add request interceptor for auth
api.interceptors.request.use((config) => {
  const customerToken = localStorage.getItem('customerToken');
  const adminToken = localStorage.getItem('adminToken');
  const token = customerToken || adminToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class NotificationService {
  constructor() {
    this.vapidPublicKey = null;
    this.registration = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.isPermissionGranted = false;
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      // Get VAPID public key
      await this.getVapidPublicKey();

      // Check current permission status
      this.isPermissionGranted = Notification.permission === 'granted';

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  async getVapidPublicKey() {
    try {
      const response = await api.get('/notifications/vapid-public-key');
      this.vapidPublicKey = response.data.publicKey;
      return this.vapidPublicKey;
    } catch (error) {
      console.error('Error getting VAPID public key:', error);
      throw error;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (Notification.permission === 'granted') {
      this.isPermissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      throw new Error('Push notifications are blocked. Please enable them in your browser settings.');
    }

    const permission = await Notification.requestPermission();
    this.isPermissionGranted = permission === 'granted';
    
    if (!this.isPermissionGranted) {
      throw new Error('Push notification permission denied');
    }

    return true;
  }

  async subscribe() {
    if (!this.isSupported || !this.registration) {
      throw new Error('Push notifications are not supported or service worker not registered');
    }

    if (!this.vapidPublicKey) {
      await this.getVapidPublicKey();
    }

    if (!this.isPermissionGranted) {
      await this.requestPermission();
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();

      if (!this.subscription) {
        // Create new subscription
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      // Send subscription to server
      await api.post('/notifications/push/subscribe', {
        subscription: this.subscription.toJSON()
      });

      console.log('Successfully subscribed to push notifications');
      return this.subscription;

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      // Unsubscribe from browser
      await this.subscription.unsubscribe();

      // Remove from server
      await api.post('/notifications/push/unsubscribe', {
        endpoint: this.subscription.endpoint
      });

      this.subscription = null;
      console.log('Successfully unsubscribed from push notifications');
      return true;

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  async getSubscriptionStatus() {
    if (!this.isSupported || !this.registration) {
      return { supported: false, subscribed: false };
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return {
        supported: true,
        subscribed: !!this.subscription,
        permission: Notification.permission
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { supported: true, subscribed: false, error: error.message };
    }
  }

  // Show local notification (fallback for when push is not available)
  showLocalNotification(title, options = {}) {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options
    });

    // Auto close after 5 seconds if not interacted with
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Get notification history
  async getHistory(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.type) params.append('type', options.type);
      if (options.category) params.append('category', options.category);
      if (options.status) params.append('status', options.status);

      const response = await api.get(`/notifications/history?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getStats(days = 30) {
    try {
      const response = await api.get(`/notifications/stats?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  // Test all notification channels
  async testNotifications() {
    try {
      const response = await api.post('/notifications/test');
      return response.data;
    } catch (error) {
      console.error('Error testing notifications:', error);
      throw error;
    }
  }

  // Handle service worker messages
  handleServiceWorkerMessage(event) {
    const { type, url, data, action } = event.data;

    switch (type) {
      case 'NOTIFICATION_CLICK':
        // Handle notification click navigation
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
        
        // Trigger custom event for app to handle
        window.dispatchEvent(new CustomEvent('notificationClick', {
          detail: { url, data, action }
        }));
        break;

      default:
        console.log('Unknown service worker message:', event.data);
    }
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notifications are supported
  static isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Get permission status
  static getPermissionStatus() {
    if (!NotificationService.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Show browser notification permission prompt
  static async requestBrowserPermission() {
    if (!NotificationService.isSupported()) {
      throw new Error('Notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
