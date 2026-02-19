// firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Firebase configuration - MUST match your app config
const firebaseConfig = {
  apiKey: "AIzaSyDlaUIHlW8WXYtOw41_41HQvIey3zVblgI",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:171949632144cfa4d8fb31",
  measurementId: "G-2H9R8P1KS8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  const { notification, data } = payload;

  const notificationTitle = notification?.title || '💬 PWA Messenger';
  const notificationOptions = {
    body: notification?.body || 'Neue Nachricht',
    icon: notification?.icon || '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data?.chatId || 'message',
    data: data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Öffnen'
      },
      {
        action: 'close',
        title: 'Schließen'
      }
    ]
  };

  // Add unread count badge
  if (data?.unreadCount) {
    const count = parseInt(data.unreadCount);
    if (!isNaN(count) && count > 0) {
      notificationOptions.badge = count;
    }
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);

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
          if (client.url.includes('messenger.future-pulse.tech') && 'focus' in client) {
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
        let url = 'https://messenger.future-pulse.tech/';
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

console.log('[firebase-messaging-sw] Service Worker initialized');
