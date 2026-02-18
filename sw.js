// sw.js
// Service Worker for PWA Messenger with Push Notifications

const CACHE_NAME = 'pwa-messenger-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/firebase.js',
  '/manifest.json',
  '/modules/auth.js',
  '/modules/ui.js',
  '/modules/state.js',
  '/modules/users.js',
  '/modules/directMessages.js',
  '/modules/groups.js',
  '/modules/groupMembers.js',
  '/modules/notifications.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Firebase requests
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// ============================================
// PUSH NOTIFICATION HANDLERS
// ============================================

/**
 * Handle incoming push notifications (background)
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    return;
  }

  const { notification, data: customData } = data;

  const notificationOptions = {
    body: notification?.body || 'Neue Nachricht',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: customData?.chatId || 'message',
    data: customData,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Öffnen',
        icon: '/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Schließen'
      }
    ]
  };

  // Add badge count if available
  if (customData?.unreadCount) {
    notificationOptions.badge = customData.unreadCount;
  }

  const title = notification?.title || 'PWA Messenger';

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const { action, notification } = event;
  const { data } = notification;

  // If user clicked "close", just close
  if (action === 'close') {
    return;
  }

  // Open the app and navigate to the relevant chat
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Focus existing window and send message to navigate
            return client.focus().then((focusedClient) => {
              if (data) {
                focusedClient.postMessage({
                  type: 'NOTIFICATION_CLICKED',
                  data: data
                });
              }
              return focusedClient;
            });
          }
        }

        // If no window is open, open a new one
        let url = '/';
        if (data) {
          // Build URL with chat information
          if (data.chatId) {
            url += `?openChat=${data.chatId}`;
          }
          if (data.chatType) {
            url += `&type=${data.chatType}`;
          }
        }

        return clients.openWindow(url);
      })
  );
});

/**
 * Handle notification close events
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

/**
 * Handle background sync for offline message sending
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(
      syncMessages()
    );
  }
});

/**
 * Sync pending messages when connection is restored
 */
async function syncMessages() {
  console.log('[SW] Syncing messages...');
  // TODO: Implement offline message queue sync
  // This would retrieve messages from IndexedDB and send them to Firebase
}

/**
 * Handle messages from the main app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count || 0;
    // Badge API is handled in main thread
    // Send to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BADGE_UPDATE',
          count: count
        });
      });
    });
  }
});

console.log('[SW] Service Worker loaded');
