// modules/clientNotifications.js
// Client-side Notification System (works without Cloud Functions)
// Shows notifications when app is open in any tab

import { auth } from '../firebase.js';

let notificationPermission = 'default';
let notificationsEnabled = false;

/**
 * Initialize client-side notifications
 */
export async function initClientNotifications() {
  if (!('Notification' in window)) {
    console.log('❌ Notifications not supported');
    return false;
  }

  notificationPermission = Notification.permission;
  
  if (notificationPermission === 'granted') {
    notificationsEnabled = true;
    console.log('✅ Client notifications ready');
    return true;
  }
  
  return false;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Dein Browser unterstützt keine Benachrichtigungen');
    return false;
  }

  const permission = await Notification.requestPermission();
  notificationPermission = permission;
  
  if (permission === 'granted') {
    notificationsEnabled = true;
    console.log('✅ Notification permission granted');
    updateNotificationUI(true);
    return true;
  } else {
    console.log('❌ Notification permission denied');
    updateNotificationUI(false);
    return false;
  }
}

/**
 * Show notification for new message
 */
export function showMessageNotification(data) {
  if (!notificationsEnabled || notificationPermission !== 'granted') {
    return;
  }

  // Don't show notification for own messages
  if (data.uid === auth.currentUser?.uid) {
    return;
  }

  // Check if window is focused
  if (document.hasFocus()) {
    // User is actively using the app, no notification needed
    return;
  }

  const { username, text, chatType, chatName } = data;
  
  const title = chatType === 'group' 
    ? `👥 ${chatName || 'Gruppe'}` 
    : `👤 @${username}`;
  
  const body = `${username}: ${text.length > 100 ? text.substring(0, 100) + '...' : text}`;

  const notification = new Notification(title, {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data.chatId || 'message',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data
  });

  // Play sound
  playNotificationSound();

  // Handle click
  notification.onclick = () => {
    window.focus();
    notification.close();
    
    // Navigate to chat if data available
    if (data.chatId) {
      const event = new CustomEvent('openChatFromNotification', {
        detail: data
      });
      window.dispatchEvent(event);
    }
  };

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Could not play notification sound');
  }
}

/**
 * Update notification UI
 */
function updateNotificationUI(enabled) {
  const btn = document.getElementById('notificationToggle');
  if (btn) {
    btn.textContent = enabled ? '🔔' : '🔕';
    btn.title = enabled ? 'Benachrichtigungen aktiv' : 'Benachrichtigungen aktivieren';
  }
}

/**
 * Toggle notifications on/off
 */
export function toggleNotifications(enabled) {
  notificationsEnabled = enabled;
  updateNotificationUI(enabled);
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  return notificationsEnabled && notificationPermission === 'granted';
}

console.log('✅ Client notifications module loaded');
