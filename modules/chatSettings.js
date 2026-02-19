// modules/chatSettings.js
// Chat-specific Settings Management Module

import { muteChat, unmuteChat, isChatMuted } from './notifications.js';

/**
 * Mute duration presets (in milliseconds)
 */
export const MUTE_DURATIONS = {
  ONE_HOUR: 60 * 60 * 1000,
  EIGHT_HOURS: 8 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  FOREVER: null // null = indefinite
};

/**
 * Show mute options menu for a chat
 * @param {string} chatId - Chat ID (group_xxx or dm_xxx)
 * @param {HTMLElement} anchorElement - Element to position menu near
 */
export function showMuteMenu(chatId, anchorElement) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('muteMenu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Check if chat is currently muted
  const isCurrentlyMuted = isChatMuted(chatId);

  // Create menu container
  const menu = document.createElement('div');
  menu.id = 'muteMenu';
  menu.className = 'mute-menu';

  // Menu options
  const options = isCurrentlyMuted
    ? [{ label: '🔊 Stummschaltung aufheben', action: () => handleUnmute(chatId) }]
    : [
        { label: '🔇 1 Stunde stumm', action: () => handleMute(chatId, MUTE_DURATIONS.ONE_HOUR) },
        { label: '🔇 8 Stunden stumm', action: () => handleMute(chatId, MUTE_DURATIONS.EIGHT_HOURS) },
        { label: '🔇 1 Tag stumm', action: () => handleMute(chatId, MUTE_DURATIONS.ONE_DAY) },
        { label: '🔇 1 Woche stumm', action: () => handleMute(chatId, MUTE_DURATIONS.ONE_WEEK) },
        { label: '🔇 Für immer stumm', action: () => handleMute(chatId, MUTE_DURATIONS.FOREVER) }
      ];

  // Create menu items
  options.forEach(option => {
    const item = document.createElement('div');
    item.className = 'mute-menu-item';
    item.textContent = option.label;
    item.onclick = () => {
      option.action();
      menu.remove();
    };
    menu.appendChild(item);
  });

  // Position menu near anchor element
  const rect = anchorElement.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  // Add to document
  document.body.appendChild(menu);

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeMenuOnOutsideClick, { once: true });
  }, 0);
}

/**
 * Close menu when clicking outside
 */
function closeMenuOnOutsideClick(event) {
  const menu = document.getElementById('muteMenu');
  if (menu && !menu.contains(event.target)) {
    menu.remove();
  }
}

/**
 * Handle mute action
 */
async function handleMute(chatId, duration) {
  try {
    if (duration === null) {
      // Mute forever
      await muteChat(chatId, 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
      showMuteNotification('Chat stumm geschaltet (unbegrenzt)');
    } else {
      await muteChat(chatId, duration);
      const durationText = formatDuration(duration);
      showMuteNotification(`Chat stumm für ${durationText}`);
    }

    // Update UI
    updateMuteButton(chatId, true);
  } catch (error) {
    console.error('Error muting chat:', error);
    alert('Fehler beim Stummschalten des Chats');
  }
}

/**
 * Handle unmute action
 */
async function handleUnmute(chatId) {
  try {
    await unmuteChat(chatId);
    showMuteNotification('Chat-Stummschaltung aufgehoben');

    // Update UI
    updateMuteButton(chatId, false);
  } catch (error) {
    console.error('Error unmuting chat:', error);
    alert('Fehler beim Aufheben der Stummschaltung');
  }
}

/**
 * Update mute button icon based on mute status
 */
export function updateMuteButton(chatId, isMuted) {
  const muteBtn = document.getElementById('muteChatBtn');
  if (muteBtn) {
    muteBtn.textContent = isMuted ? '🔇' : '🔔';
    muteBtn.title = isMuted ? 'Stummschaltung aufheben' : 'Chat stummschalten';
    muteBtn.dataset.chatId = chatId;
  }
}

/**
 * Initialize mute button state for current chat
 */
export function initMuteButton(chatId) {
  const isMuted = isChatMuted(chatId);
  updateMuteButton(chatId, isMuted);
}

/**
 * Format duration to human-readable text
 */
function formatDuration(milliseconds) {
  const hours = milliseconds / (1000 * 60 * 60);
  
  if (hours < 24) {
    return `${Math.round(hours)} Stunde${hours > 1 ? 'n' : ''}`;
  } else {
    const days = hours / 24;
    return `${Math.round(days)} Tag${days > 1 ? 'e' : ''}`;
  }
}

/**
 * Show temporary notification about mute status change
 */
function showMuteNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'mute-notification';
  notification.textContent = message;

  // Add to document
  document.body.appendChild(notification);

  // Fade in
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Add muted badge to chat list item
 */
export function addMutedBadge(chatElement, chatId) {
  if (isChatMuted(chatId)) {
    const badge = document.createElement('span');
    badge.className = 'muted-badge';
    badge.textContent = '🔇';
    badge.title = 'Stummgeschaltet';
    chatElement.querySelector('.dm-chat-preview')?.appendChild(badge);
  }
}

/**
 * Get all muted chats
 */
export function getMutedChats() {
  const settings = getNotificationSettings();
  return settings.chatMuted || {};
}

console.log('✅ Chat Settings module loaded');
