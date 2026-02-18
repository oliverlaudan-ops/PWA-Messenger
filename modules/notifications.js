// modules/notifications.js
// Push Notification Management Module

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging.js";
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { auth, db } from '../firebase.js';

let messaging = null;
let currentFCMToken = null;
let notificationSettings = {
  enabled: true,
  sound: true,
  chatMuted: {}, // chatId: muteUntilTimestamp
  doNotDisturb: false,
  doNotDisturbUntil: null
};

// VAPID Key - Muss in Firebase Console generiert werden
// Cloud Messaging → Web Configuration → Web Push certificates
const VAPID_KEY = 'DEIN_VAPID_KEY_HIER'; // TODO: Replace with actual VAPID key

/**
 * Initialize Firebase Cloud Messaging
 */
export async function initNotifications() {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('❌ Notifications not supported in this browser');
      return false;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return false;
    }

    // Initialize messaging
    messaging = getMessaging();

    // Load user's notification settings
    await loadNotificationSettings();

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      console.log('📢 Notification permission not set, will prompt user');
      return false;
    }

    if (Notification.permission === 'granted') {
      await registerFCMToken();
      setupForegroundListener();
      console.log('✅ Notifications initialized');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Notification permission denied');
      return false;
    }

  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  try {
    if (!messaging) {
      console.error('Messaging not initialized');
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      await registerFCMToken();
      setupForegroundListener();
      
      // Update UI
      updateNotificationUI(true);
      
      return true;
    } else {
      console.log('❌ Notification permission denied');
      updateNotificationUI(false);
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Register FCM token with Firebase
 */
async function registerFCMToken() {
  try {
    if (!auth.currentUser) {
      console.log('No authenticated user');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered for notifications');

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      currentFCMToken = token;
      console.log('📱 FCM Token:', token);

      // Save token to Firestore
      await saveFCMTokenToFirestore(token);
    } else {
      console.log('No registration token available');
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
}

/**
 * Save FCM token to user's Firestore document
 */
async function saveFCMTokenToFirestore(token) {
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    await updateDoc(userRef, {
      fcmTokens: {
        [token]: {
          createdAt: serverTimestamp(),
          userAgent: navigator.userAgent,
          lastUsed: serverTimestamp()
        }
      },
      notificationsEnabled: true
    });

    console.log('✅ FCM token saved to Firestore');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

/**
 * Setup listener for foreground notifications
 */
function setupForegroundListener() {
  onMessage(messaging, (payload) => {
    console.log('📬 Foreground message received:', payload);

    // Check if notifications are muted
    if (!shouldShowNotification(payload)) {
      console.log('🔇 Notification muted by settings');
      return;
    }

    // Display notification
    displayNotification(payload);

    // Play sound if enabled
    if (notificationSettings.sound) {
      playNotificationSound();
    }
  });
}

/**
 * Check if notification should be shown based on user settings
 */
function shouldShowNotification(payload) {
  // Check if notifications are globally disabled
  if (!notificationSettings.enabled) {
    return false;
  }

  // Check Do Not Disturb mode
  if (notificationSettings.doNotDisturb) {
    if (notificationSettings.doNotDisturbUntil) {
      const now = Date.now();
      if (now < notificationSettings.doNotDisturbUntil) {
        return false;
      } else {
        // DND expired
        notificationSettings.doNotDisturb = false;
        notificationSettings.doNotDisturbUntil = null;
      }
    } else {
      return false;
    }
  }

  // Check if specific chat is muted
  const chatId = payload.data?.chatId;
  if (chatId && notificationSettings.chatMuted[chatId]) {
    const muteUntil = notificationSettings.chatMuted[chatId];
    const now = Date.now();
    
    if (now < muteUntil) {
      return false;
    } else {
      // Mute expired
      delete notificationSettings.chatMuted[chatId];
      saveNotificationSettings();
    }
  }

  return true;
}

/**
 * Display notification in foreground
 */
function displayNotification(payload) {
  const { notification, data } = payload;
  
  const notificationOptions = {
    body: notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data?.chatId || 'general',
    data: data,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  if (data?.unreadCount) {
    notificationOptions.badge = data.unreadCount;
  }

  new Notification(notification.title, notificationOptions);
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3'); // You'll need to add this file
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play sound:', e));
  } catch (error) {
    console.log('Notification sound not available');
  }
}

/**
 * Load user's notification settings from Firestore
 */
async function loadNotificationSettings() {
  try {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      
      if (data.notificationSettings) {
        notificationSettings = {
          ...notificationSettings,
          ...data.notificationSettings
        };
      }
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
}

/**
 * Save notification settings to Firestore
 */
async function saveNotificationSettings() {
  try {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      notificationSettings: notificationSettings
    });

    console.log('✅ Notification settings saved');
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

/**
 * Toggle notifications on/off
 */
export async function toggleNotifications(enabled) {
  notificationSettings.enabled = enabled;
  await saveNotificationSettings();
  updateNotificationUI(enabled);
}

/**
 * Toggle notification sound
 */
export async function toggleNotificationSound(enabled) {
  notificationSettings.sound = enabled;
  await saveNotificationSettings();
}

/**
 * Mute specific chat for duration (in milliseconds)
 */
export async function muteChat(chatId, duration) {
  const muteUntil = Date.now() + duration;
  notificationSettings.chatMuted[chatId] = muteUntil;
  await saveNotificationSettings();
  
  console.log(`🔇 Chat ${chatId} muted until ${new Date(muteUntil).toLocaleString()}`);
}

/**
 * Unmute specific chat
 */
export async function unmuteChat(chatId) {
  delete notificationSettings.chatMuted[chatId];
  await saveNotificationSettings();
  console.log(`🔊 Chat ${chatId} unmuted`);
}

/**
 * Check if chat is currently muted
 */
export function isChatMuted(chatId) {
  if (!notificationSettings.chatMuted[chatId]) {
    return false;
  }
  
  const muteUntil = notificationSettings.chatMuted[chatId];
  const now = Date.now();
  
  if (now >= muteUntil) {
    delete notificationSettings.chatMuted[chatId];
    saveNotificationSettings();
    return false;
  }
  
  return true;
}

/**
 * Enable Do Not Disturb mode
 */
export async function enableDoNotDisturb(duration = null) {
  notificationSettings.doNotDisturb = true;
  
  if (duration) {
    notificationSettings.doNotDisturbUntil = Date.now() + duration;
  } else {
    notificationSettings.doNotDisturbUntil = null; // Indefinite
  }
  
  await saveNotificationSettings();
  console.log('🌙 Do Not Disturb enabled');
}

/**
 * Disable Do Not Disturb mode
 */
export async function disableDoNotDisturb() {
  notificationSettings.doNotDisturb = false;
  notificationSettings.doNotDisturbUntil = null;
  await saveNotificationSettings();
  console.log('🔔 Do Not Disturb disabled');
}

/**
 * Check if Do Not Disturb is active
 */
export function isDoNotDisturbActive() {
  if (!notificationSettings.doNotDisturb) {
    return false;
  }
  
  if (notificationSettings.doNotDisturbUntil) {
    const now = Date.now();
    if (now >= notificationSettings.doNotDisturbUntil) {
      notificationSettings.doNotDisturb = false;
      notificationSettings.doNotDisturbUntil = null;
      saveNotificationSettings();
      return false;
    }
  }
  
  return true;
}

/**
 * Update notification UI elements
 */
function updateNotificationUI(enabled) {
  // Update bell icon or notification toggle button
  const notificationBtn = document.getElementById('notificationToggle');
  if (notificationBtn) {
    notificationBtn.textContent = enabled ? '🔔' : '🔕';
    notificationBtn.title = enabled ? 'Benachrichtigungen an' : 'Benachrichtigungen aus';
  }
}

/**
 * Get current notification settings
 */
export function getNotificationSettings() {
  return { ...notificationSettings };
}

/**
 * Update App Badge (PWA Badge API)
 */
export function updateAppBadge(count) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(e => console.log('Badge not supported'));
    } else {
      navigator.clearAppBadge().catch(e => console.log('Badge not supported'));
    }
  }
}

/**
 * Clear App Badge
 */
export function clearAppBadge() {
  updateAppBadge(0);
}

console.log('✅ Notifications module loaded');
