// Service Worker for Push Notifications only.
// It does not cache or intercept page requests: the shop always loads from
// the network, so visitors get the latest version after every deploy.

const DEFAULT_ICON = '/logo.png';

// Take over from any older worker straight away
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Older versions of this worker pre-cached files (cache 'stes-notifications-v1').
// This one uses no cache, so delete every cache left behind.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();
    })()
  );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'STES Piscines',
    body: 'Vous avez une nouvelle notification',
    icon: DEFAULT_ICON,
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
      icon: notificationData.icon || DEFAULT_ICON,
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
