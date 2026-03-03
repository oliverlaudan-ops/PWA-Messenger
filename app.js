// app.js
// Main application entry point - connects all modules

import { initAuthListener, signup, login, setUsername, logout } from './modules/auth.js';
import { showScreen, switchTab } from './modules/ui.js';
import { 
  showCreateGroup, 
  closeCreateGroup, 
  createGroup, 
  loadGroupList, 
  openGroupChat, 
  closeGroupChat, 
  sendGroupMessage,
  markAllGroupMessagesAsRead
} from './modules/groups.js';
import { 
  loadDMChatList, 
  startDirectMessage, 
  closeDMChat, 
  sendDMMessage 
} from './modules/directMessages.js';
import { 
  showUserSearch, 
  closeUserSearch, 
  filterUsers 
} from './modules/users.js';
import {
  showGroupMembers,
  closeGroupMembers,
  updateGroupSettings,
  deleteGroup
} from './modules/groupMembers.js';
import {
  initNotifications,
  requestNotificationPermission,
  toggleNotifications,
  toggleNotificationSound,
  muteChat,
  unmuteChat,
  isChatMuted,
  enableDoNotDisturb,
  disableDoNotDisturb,
  isDoNotDisturbActive,
  getNotificationSettings,
  updateAppBadge,
  clearAppBadge,
  getPrivacySettings,
  setDmSettings,
  blockUser,
  unblockUser,
  getBlockedUsers
} from './modules/notifications.js';
import {
  showMuteMenu,
  initMuteButton
} from './modules/chatSettings.js';
import * as State from './modules/state.js';

// Expose functions to window for onclick handlers in HTML
window.showLogin = () => showScreen('loginScreen');
window.showRegister = () => showScreen('registerScreen');
window.signup = signup;
window.login = login;
window.setUsername = setUsername;
window.logout = logout;

window.switchTab = switchTab;

window.showCreateGroup = showCreateGroup;
window.closeCreateGroup = closeCreateGroup;
window.createGroup = createGroup;
window.openGroupChat = openGroupChat;
window.closeGroupChat = closeGroupChat;
window.sendGroupMessage = sendGroupMessage;

window.showGroupMembers = showGroupMembers;
window.closeGroupMembers = closeGroupMembers;
window.updateGroupSettings = updateGroupSettings;
window.deleteGroup = deleteGroup;

window.showUserSearch = showUserSearch;
window.closeUserSearch = closeUserSearch;
window.filterUsers = filterUsers;

window.closeDMChat = closeDMChat;
window.sendDMMessage = sendDMMessage;

// Notification functions
window.requestNotifications = requestNotificationPermission;
window.toggleNotifications = toggleNotifications;
window.toggleNotificationSound = toggleNotificationSound;
window.muteChat = muteChat;
window.unmuteChat = unmuteChat;
window.isChatMuted = isChatMuted;
window.enableDoNotDisturb = enableDoNotDisturb;
window.disableDoNotDisturb = disableDoNotDisturb;
window.isDoNotDisturbActive = isDoNotDisturbActive;
window.getNotificationSettings = getNotificationSettings;
window.showNotificationSettings = showNotificationSettings;
window.closeNotificationSettings = closeNotificationSettings;

// User Settings Modal
window.showUserSettings = showUserSettings;
window.closeUserSettings = closeUserSettings;
window.saveDmSettings = saveDmSettings;
window.toggleNotificationsFromModal = toggleNotificationsFromModal;
window.unblockUserFromModal = unblockUserFromModal;

// Chat Settings functions
window.toggleChatMute = toggleChatMute;
window.initMuteButton = initMuteButton;

/**
 * Toggle mute for current chat
 */
function toggleChatMute() {
  // Determine which chat is currently open
  const groupChatView = document.getElementById('groupChatView');
  const dmChatView = document.getElementById('dmChatView');

  let chatId = null;
  let muteBtn = null;

  if (!groupChatView.classList.contains('hidden')) {
    // Group chat is open — read live value from State module
    chatId = State.currentGroupId;
    muteBtn = document.getElementById('muteChatBtn');
  } else if (!dmChatView.classList.contains('hidden')) {
    // DM chat is open — read live value from State module
    chatId = State.currentDMChatId;
    muteBtn = document.getElementById('muteChatBtnDM');
  }

  if (chatId && muteBtn) {
    showMuteMenu(chatId, muteBtn);
  } else {
    console.error('Could not determine current chat');
  }
}

// Notification Settings Modal
function showNotificationSettings() {
  const modal = document.getElementById('notificationSettingsModal');
  if (modal) {
    modal.classList.remove('hidden');
    updateNotificationSettingsUI();
  }
}

function closeNotificationSettings() {
  const modal = document.getElementById('notificationSettingsModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function updateNotificationSettingsUI() {
  const settings = getNotificationSettings();

  const enabledToggle = document.getElementById('notificationsEnabled');
  const soundToggle = document.getElementById('notificationSound');
  const dndStatus = document.getElementById('dndStatus');

  if (enabledToggle) enabledToggle.checked = settings.enabled;
  if (soundToggle) soundToggle.checked = settings.sound;

  if (dndStatus) {
    if (settings.doNotDisturb) {
      if (settings.doNotDisturbUntil) {
        const until = new Date(settings.doNotDisturbUntil);
        dndStatus.textContent = `Aktiv bis ${until.toLocaleString('de-DE')}`;
      } else {
        dndStatus.textContent = 'Aktiv';
      }
    } else {
      dndStatus.textContent = 'Inaktiv';
    }
  }
}

// User Settings Modal Functions
async function showUserSettings() {
  const modal = document.getElementById('userSettingsModal');
  if (modal) {
    modal.classList.remove('hidden');
    await updateUserSettingsUI();
  }
}

function closeUserSettings() {
  const modal = document.getElementById('userSettingsModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function updateUserSettingsUI() {
  // Update DM settings
  const privacy = getPrivacySettings();
  const dmRadios = document.getElementsByName('dmSettings');
  for (const radio of dmRadios) {
    radio.checked = radio.value === privacy.dmSettings;
  }
  
  // Update notification toggle
  const notifSettings = getNotificationSettings();
  const notifToggle = document.getElementById('notificationsEnabled');
  if (notifToggle) {
    notifToggle.checked = notifSettings.enabled;
  }
  
  // Update blocked users list
  await updateBlockedUsersList();
}

async function updateBlockedUsersList() {
  const listContainer = document.getElementById('blockedUsersList');
  if (!listContainer) return;
  
  const blocked = getBlockedUsers();
  const blockedUids = Object.keys(blocked);
  
  if (blockedUids.length === 0) {
    listContainer.innerHTML = '<p class="no-blocked">Keine blockierten Benutzer</p>';
    return;
  }
  
  // Load user data for each blocked user
  const { loadUserData } = await import('./modules/users.js');
  
  let html = '';
  for (const uid of blockedUids) {
    const userData = await loadUserData(uid);
    const username = userData?.username || 'Unknown';
    html += `
      <div class="blocked-user-item">
        <span>@${username}</span>
        <button class="btn btn-small" onclick="unblockUserFromModal('${uid}')">Entblocken</button>
      </div>
    `;
  }
  
  listContainer.innerHTML = html;
}

async function saveDmSettings(mode) {
  await setDmSettings(mode);
}

async function toggleNotificationsFromModal(enabled) {
  await toggleNotifications(enabled);
}

async function unblockUserFromModal(uid) {
  await unblockUser(uid);
  await updateBlockedUsersList();
}

// Event listeners for cross-module communication
window.addEventListener('loadGroupList', () => {
  loadGroupList();
});

window.addEventListener('loadDMList', () => {
  loadDMChatList();
});

window.addEventListener('startDirectMessage', (e) => {
  startDirectMessage(e.detail);
});

// Listen for service worker messages (notification clicks)
navigator.serviceWorker?.addEventListener('message', (event) => {
  console.log('Message from SW:', event.data);

  if (event.data.type === 'NOTIFICATION_CLICKED') {
    const { data } = event.data;

    // Navigate to the relevant chat
    if (data.chatId && data.chatType === 'group') {
      openGroupChat(data.chatId, data.chatName || 'Gruppe');
    } else if (data.chatId && data.chatType === 'dm') {
      // Handle DM navigation
      const userId = data.userId;
      const username = data.username;
      if (userId && username) {
        startDirectMessage({ uid: userId, username: username });
      }
    }
  }

  if (event.data.type === 'BADGE_UPDATE') {
    updateAppBadge(event.data.count);
  }
});

// Check URL parameters for deep linking from notifications
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const openChat = urlParams.get('openChat');
  const chatType = urlParams.get('type');

  if (openChat && chatType) {
    setTimeout(() => {
      if (chatType === 'group') {
        openGroupChat(openChat, 'Gruppe');
      }
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 1000);
  }
});

// Initialize auth state listener
initAuthListener();

// Initialize notifications when user is logged in
window.addEventListener('userLoggedIn', async () => {
  console.log('User logged in, initializing notifications...');
  await initNotifications();
});

console.log('✅ App initialized - modular structure loaded');

// Dark Mode Toggle
window.toggleDarkMode = function() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");
  const currentTheme = html.getAttribute("data-theme");
  
  if (currentTheme === "dark") {
    html.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
    if (toggleBtn) toggleBtn.textContent = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    if (toggleBtn) toggleBtn.textContent = "☀️";
  }
};

// Load saved theme on startup
window.addEventListener("load", () => {
  const savedTheme = localStorage.getItem("theme");
  const toggleBtn = document.getElementById("themeToggle");
  
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (toggleBtn) toggleBtn.textContent = "☀️";
  } else if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    if (toggleBtn) toggleBtn.textContent = "🌙";
  }
});


// Add touch support for theme toggle
window.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    // Prevent any default touch behavior
    themeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDarkMode();
    }, { passive: false });
  }
});
