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

window.showUserSearch = showUserSearch;
window.closeUserSearch = closeUserSearch;
window.filterUsers = filterUsers;

window.closeDMChat = closeDMChat;
window.sendDMMessage = sendDMMessage;

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

// Initialize auth state listener
initAuthListener();

console.log('✅ App initialized - modular structure loaded');
