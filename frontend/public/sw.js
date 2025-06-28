// Service Worker for Push Notifications
const CACHE_NAME = 'stes-notifications-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event (basic caching strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'STES Piscines',
    body: 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
    actions: [],
    requireInteraction: false,
    silent: false
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      vibrate: notificationData.vibrate || [200, 100, 200],
      timestamp: Date.now()
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;

  // Close the notification
  notification.close();

  // Handle different actions
  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      let url = '/';
      
      // Determine URL based on action and data
      if (action === 'view' || action === 'rate') {
        if (data.orderId) {
          url = `/account?tab=orders&order=${data.orderId}`;
        } else if (data.orderNumber) {
          url = `/track-order?order=${data.orderNumber}`;
        }
      } else if (action === 'track') {
        if (data.orderNumber) {
          url = `/track-order?order=${data.orderNumber}`;
        }
      } else if (data.action) {
        switch (data.action) {
          case 'view_order':
            url = data.orderId ? `/account?tab=orders&order=${data.orderId}` : '/account';
            break;
          case 'track_order':
            url = data.orderNumber ? `/track-order?order=${data.orderNumber}` : '/track-order';
            break;
          case 'rate_order':
            url = data.orderId ? `/account?tab=orders&order=${data.orderId}&action=rate` : '/account';
            break;
          case 'view_product':
            url = data.productId ? `/product/${data.productId}` : '/shop';
            break;
          case 'view_promotion':
            url = data.promotionUrl || '/shop';
            break;
          default:
            url = '/';
        }
      }

      // Try to focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.focus();
          // Navigate to the desired URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            data: data,
            action: action
          });
          return;
        }
      }

      // No existing window found, open new one
      if (clients.openWindow) {
        const fullUrl = self.location.origin + url;
        await clients.openWindow(fullUrl);
      }
    })()
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  const notification = event.notification;
  const data = notification.data || {};

  // Track notification dismissal (optional)
  if (data.trackingId) {
    // Could send analytics data here
    console.log('Notification dismissed:', data.trackingId);
  }
});

// Background sync event (for offline notifications)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync pending notifications when back online
      syncPendingNotifications()
    );
  }
});

// Sync pending notifications function
async function syncPendingNotifications() {
  try {
    // Get pending notifications from IndexedDB or localStorage
    const pendingNotifications = await getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      await self.registration.showNotification(notification.title, notification.options);
    }

    // Clear pending notifications after showing
    await clearPendingNotifications();
  } catch (error) {
    console.error('Error syncing pending notifications:', error);
  }
}

// Helper functions for offline notification storage
async function getPendingNotifications() {
  // Implementation would depend on your storage strategy
  // This is a placeholder
  return [];
}

async function clearPendingNotifications() {
  // Implementation would depend on your storage strategy
  // This is a placeholder
}

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CACHE_NOTIFICATION':
      // Cache notification for offline display
      cacheNotificationForOffline(data);
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Cache notification for offline display
async function cacheNotificationForOffline(notificationData) {
  try {
    // Store in IndexedDB or localStorage for offline access
    // This is a placeholder implementation
    console.log('Caching notification for offline:', notificationData);
  } catch (error) {
    console.error('Error caching notification:', error);
  }
}

// Error event
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker loaded successfully');
