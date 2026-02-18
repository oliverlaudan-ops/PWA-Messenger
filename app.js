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
  sendGroupMessage 
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
  clearAppBadge
} from './modules/notifications.js';

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
