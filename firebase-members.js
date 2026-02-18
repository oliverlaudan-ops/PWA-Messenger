// firebase-members.js
// Group members functionality

import { db, auth } from './firebase.js';
import { getDoc, doc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Get current group ID by finding the active group
async function getCurrentGroupId() {
  // Method 1: Try to get from data attribute
  const groupChatView = document.getElementById('groupChatView');
  if (groupChatView && groupChatView.dataset.groupId) {
    return groupChatView.dataset.groupId;
  }
  
  // Method 2: Parse from current group name and find in Firestore
  const groupNameEl = document.getElementById('groupChatName');
  if (!groupNameEl) return null;
  
  const displayName = groupNameEl.textContent.replace('👥 ', '').trim();
  
  try {
    // Find group by name that user is a member of
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where('members', 'array-contains', auth.currentUser.uid),
      where('name', '==', displayName)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
  } catch (e) {
    console.error('Error finding group:', e);
  }
  
  return null;
}

// Show Group Members Modal
window.showGroupMembers = async () => {
  const modal = document.getElementById('groupMembersModal');
  const membersList = document.getElementById('groupMembersList');
  
  modal.classList.remove('hidden');
  membersList.innerHTML = '<div class="spinner"></div>';
  
  // Get current group ID
  const groupId = await getCurrentGroupId();
  
  if (!groupId) {
    console.error('No current group selected');
    membersList.innerHTML = '<div class="no-users">Gruppe nicht gefunden</div>';
    return;
  }
  
  console.log('✅ Found groupId:', groupId);
  
  try {
    // Load group data
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    
    if (!groupDoc.exists()) {
      membersList.innerHTML = '<div class="no-users">Gruppe nicht gefunden</div>';
      return;
    }
    
    const groupData = groupDoc.data();
    const members = groupData.members || [];
    const admins = groupData.admins || [];
    const creatorId = groupData.createdBy;
    
    // Update header
    document.getElementById('membersModalTitle').textContent = `Mitglieder von "${groupData.name}"`;
    document.getElementById('membersCount').textContent = `${members.length} Mitglied${members.length !== 1 ? 'er' : ''}`;
    
    // Load member details
    membersList.innerHTML = '';
    
    for (const uid of members) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        const memberItem = document.createElement('div');
        memberItem.className = 'user-item';
        memberItem.style.cursor = 'default';
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = userData.username.charAt(0).toUpperCase();
        
        const details = document.createElement('div');
        details.className = 'user-details';
        details.style.flex = '1';
        
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';
        topRow.style.gap = '8px';
        topRow.style.marginBottom = '4px';
        
        const username = document.createElement('div');
        username.className = 'user-username';
        username.textContent = `@${userData.username}`;
        
        topRow.appendChild(username);
        
        // Add badges
        if (uid === creatorId) {
          const creatorBadge = document.createElement('span');
          creatorBadge.className = 'role-badge creator-badge';
          creatorBadge.textContent = '👑 Creator';
          topRow.appendChild(creatorBadge);
        } else if (admins.includes(uid)) {
          const adminBadge = document.createElement('span');
          adminBadge.className = 'role-badge admin-badge';
          adminBadge.textContent = '⚡ Admin';
          topRow.appendChild(adminBadge);
        }
        
        const email = document.createElement('div');
        email.className = 'user-email';
        email.textContent = userData.email;
        
        details.appendChild(topRow);
        details.appendChild(email);
        memberItem.appendChild(avatar);
        memberItem.appendChild(details);
        membersList.appendChild(memberItem);
      }
    }
  } catch (e) {
    console.error('Error loading group members:', e);
    membersList.innerHTML = '<div class="no-users">Fehler beim Laden der Mitglieder</div>';
  }
};

// Close Group Members Modal
window.closeGroupMembers = () => {
  document.getElementById('groupMembersModal').classList.add('hidden');
};

console.log('✅ Firebase members module loaded');
