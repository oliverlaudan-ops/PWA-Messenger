// Patch to ensure groupId is set in DOM when opening group chat
// This must load AFTER firebase.js

(function() {
  // Wait for openGroupChat to be defined
  const checkAndPatch = () => {
    if (typeof window.openGroupChat === 'function') {
      console.log('✅ Patching openGroupChat...');
      
      // Store original function
      const originalOpenGroupChat = window.openGroupChat;
      
      // Create wrapper
      window.openGroupChat = async function(groupId, groupName) {
        console.log('🔧 Setting groupId in DOM:', groupId);
        
        // Set data attribute FIRST
        const groupChatView = document.getElementById('groupChatView');
        if (groupChatView) {
          groupChatView.dataset.groupId = groupId;
          console.log('✅ groupId set:', groupChatView.dataset.groupId);
        } else {
          console.error('❌ groupChatView element not found!');
        }
        
        // Call original function
        return originalOpenGroupChat.call(this, groupId, groupName);
      };
      
      console.log('✅ openGroupChat patched successfully');
    } else {
      // Not ready yet, try again
      console.log('⏳ openGroupChat not ready, retrying...');
      setTimeout(checkAndPatch, 100);
    }
  };
  
  // Start checking
  checkAndPatch();
})();
