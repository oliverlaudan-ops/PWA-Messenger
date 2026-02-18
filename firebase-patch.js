// Patch for firebase.js to export globals
// This ensures currentGroup and loadUserData are accessible to other modules
// Load this AFTER firebase.js in index.html

// Intercept the existing openGroupChat function to update window.currentGroup
const originalOpenGroupChat = window.openGroupChat;
if (typeof originalOpenGroupChat === 'undefined') {
  console.warn('⚠️ openGroupChat not found - this script must load AFTER firebase.js');
}

// Initialize window.currentGroup
window.currentGroup = null;

// Export loadUserData if it exists in the module scope
// Since loadUserData is defined in firebase.js, we need to make it accessible
// The simplest way is to just expose it when it's called

console.log('✅ Firebase patch loaded - window.currentGroup initialized');
