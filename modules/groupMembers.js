// modules/groupMembers.js
// Group member management and permissions

import { db, auth } from './state.js';
import { loadUserData } from './users.js';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Permission checks
export function isCreator(groupData, userId) {
  return groupData.createdBy === userId;
}

export function isAdmin(groupData, userId) {
  return groupData.admins && groupData.admins.includes(userId);
}

export function canManageMembers(groupData, userId) {
  return isCreator(groupData, userId) || isAdmin(groupData, userId);
}

export function canManageAdmins(groupData, userId) {
  return isCreator(groupData, userId) || isAdmin(groupData, userId);
}

export function canEditGroup(groupData, userId) {
  return isCreator(groupData, userId) || isAdmin(groupData, userId);
}

export function canDeleteGroup(groupData, userId) {
  return isCreator(groupData, userId);
}

// Show group members with management options
export async function showGroupMembers() {
  const groupChatView = document.getElementById('groupChatView');
  const groupId = groupChatView.dataset.groupId;
  
  if (!groupId) {
    console.error('No groupId found');
    return;
  }
  
  const modal = document.getElementById('groupMembersModal');
  modal.classList.remove('hidden');
  
  const membersList = document.getElementById('groupMembersList');
  membersList.innerHTML = '<div class="spinner"></div>';
  
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      membersList.innerHTML = '<div class="no-users">Gruppe nicht gefunden</div>';
      return;
    }
    
    const groupData = groupDoc.data();
    const members = groupData.members || [];
    const admins = groupData.admins || [];
    const creatorId = groupData.createdBy;
    const currentUserId = auth.currentUser.uid;
    
    // Update modal title with group name
    document.getElementById('membersModalTitle').textContent = `👥 ${groupData.name} - Mitglieder`;
    document.getElementById('membersCount').textContent = `${members.length} Mitglied${members.length !== 1 ? 'er' : ''}`;
    
    // Check permissions
    const canManage = canManageMembers(groupData, currentUserId);
    const canManageAdminsPermission = canManageAdmins(groupData, currentUserId);
    const isGroupCreator = isCreator(groupData, currentUserId);
    
    membersList.innerHTML = '';
    
    // Add member button (for admins/creator)
    if (canManage) {
      const addMemberBtn = document.createElement('button');
      addMemberBtn.className = 'btn btn-primary btn-small';
      addMemberBtn.style.width = '100%';
      addMemberBtn.style.marginBottom = '16px';
      addMemberBtn.textContent = '➕ Mitglied hinzufügen';
      addMemberBtn.onclick = () => showAddMemberSearch(groupId, groupData);
      membersList.appendChild(addMemberBtn);
    }
    
    // Group settings button (for admins/creator)
    if (canEditGroup(groupData, currentUserId)) {
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'btn btn-secondary btn-small';
      settingsBtn.style.width = '100%';
      settingsBtn.style.marginBottom = '16px';
      settingsBtn.textContent = '⚙️ Gruppeneinstellungen';
      settingsBtn.onclick = () => showGroupSettings(groupId, groupData);
      membersList.appendChild(settingsBtn);
    }
    
    // Render members
    for (const memberId of members) {
      const userData = await loadUserData(memberId);
      if (!userData) continue;
      
      const memberItem = document.createElement('div');
      memberItem.className = 'user-item';
      memberItem.style.display = 'flex';
      memberItem.style.alignItems = 'center';
      memberItem.style.padding = '12px';
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = userData.username.charAt(0).toUpperCase();
      
      // Details
      const details = document.createElement('div');
      details.className = 'user-details';
      details.style.flex = '1';
      
      const username = document.createElement('div');
      username.className = 'user-username';
      username.textContent = `@${userData.username}`;
      
      // Badges
      const badgeContainer = document.createElement('span');
      badgeContainer.style.marginLeft = '8px';
      
      if (memberId === creatorId) {
        const creatorBadge = document.createElement('span');
        creatorBadge.textContent = '👑';
        creatorBadge.title = 'Creator';
        creatorBadge.style.fontSize = '16px';
        badgeContainer.appendChild(creatorBadge);
      } else if (admins.includes(memberId)) {
        const adminBadge = document.createElement('span');
        adminBadge.textContent = '⚡';
        adminBadge.title = 'Admin';
        adminBadge.style.fontSize = '16px';
        badgeContainer.appendChild(adminBadge);
      }
      
      username.appendChild(badgeContainer);
      
      const email = document.createElement('div');
      email.className = 'user-email';
      email.textContent = userData.email;
      
      details.appendChild(username);
      details.appendChild(email);
      
      // Action buttons
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      
      // Admin toggle (only for creator and admins, but not for creator themselves)
      if (canManageAdminsPermission && memberId !== creatorId) {
        const isCurrentlyAdmin = admins.includes(memberId);
        const adminBtn = document.createElement('button');
        adminBtn.className = 'btn btn-small';
        adminBtn.style.padding = '4px 8px';
        adminBtn.style.fontSize = '12px';
        
        if (isCurrentlyAdmin) {
          adminBtn.classList.add('btn-secondary');
          adminBtn.textContent = '⚡ Admin';
          adminBtn.title = 'Admin-Status entfernen';
          adminBtn.onclick = () => removeAdmin(groupId, memberId, userData.username);
        } else {
          adminBtn.classList.add('btn-primary');
          adminBtn.textContent = '👤 Member';
          adminBtn.title = 'Zum Admin ernennen';
          adminBtn.onclick = () => makeAdmin(groupId, memberId, userData.username);
        }
        
        // Admins can remove their own admin status
        if (memberId === currentUserId && !isGroupCreator) {
          adminBtn.disabled = false;
        }
        
        actions.appendChild(adminBtn);
      }
      
      // Remove button (creator can't be removed, users can leave)
      if (memberId === currentUserId && memberId !== creatorId) {
        // Leave group button for self
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'btn btn-danger btn-small';
        leaveBtn.style.padding = '4px 8px';
        leaveBtn.style.fontSize = '12px';
        leaveBtn.textContent = '🚪 Verlassen';
        leaveBtn.onclick = () => leaveGroup(groupId);
        actions.appendChild(leaveBtn);
      } else if (canManage && memberId !== creatorId && memberId !== currentUserId) {
        // Remove member button for admins/creator
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.style.padding = '4px 8px';
        removeBtn.style.fontSize = '12px';
        removeBtn.textContent = '🗑️';
        removeBtn.title = 'Entfernen';
        removeBtn.onclick = () => removeMember(groupId, memberId, userData.username);
        actions.appendChild(removeBtn);
      }
      
      memberItem.appendChild(avatar);
      memberItem.appendChild(details);
      memberItem.appendChild(actions);
      membersList.appendChild(memberItem);
    }
    
  } catch (e) {
    console.error('Error loading group members:', e);
    membersList.innerHTML = '<div class="no-users">Fehler beim Laden der Mitglieder</div>';
  }
}

// Close group members modal
export function closeGroupMembers() {
  document.getElementById('groupMembersModal').classList.add('hidden');
}

// Add member to group
async function addMemberToGroup(groupId, userId, username) {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      [`unreadCount.${userId}`]: 0
    });
    
    alert(`@${username} wurde zur Gruppe hinzugefügt!`);
    showGroupMembers(); // Refresh
  } catch (e) {
    console.error('Error adding member:', e);
    alert('Fehler beim Hinzufügen des Mitglieds.');
  }
}

// Remove member from group
async function removeMember(groupId, userId, username) {
  if (!confirm(`@${username} wirklich aus der Gruppe entfernen?`)) return;
  
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();
    
    // Remove from members and admins
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      admins: arrayRemove(userId)
    });
    
    alert(`@${username} wurde entfernt.`);
    showGroupMembers(); // Refresh
  } catch (e) {
    console.error('Error removing member:', e);
    alert('Fehler beim Entfernen.');
  }
}

// Leave group
async function leaveGroup(groupId) {
  if (!confirm('Möchtest du diese Gruppe wirklich verlassen?')) return;
  
  try {
    const userId = auth.currentUser.uid;
    const groupRef = doc(db, 'groups', groupId);
    
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      admins: arrayRemove(userId)
    });
    
    alert('Du hast die Gruppe verlassen.');
    closeGroupMembers();
    
    // Close group chat and return to list
    window.closeGroupChat();
  } catch (e) {
    console.error('Error leaving group:', e);
    alert('Fehler beim Verlassen der Gruppe.');
  }
}

// Make user admin
async function makeAdmin(groupId, userId, username) {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      admins: arrayUnion(userId)
    });
    
    alert(`@${username} ist jetzt Admin!`);
    showGroupMembers(); // Refresh
  } catch (e) {
    console.error('Error making admin:', e);
    alert('Fehler beim Ernennen.');
  }
}

// Remove admin status
async function removeAdmin(groupId, userId, username) {
  const isOwnStatus = userId === auth.currentUser.uid;
  const confirmMessage = isOwnStatus 
    ? 'Möchtest du deinen Admin-Status wirklich entfernen?'
    : `Admin-Status von @${username} wirklich entfernen?`;
  
  if (!confirm(confirmMessage)) return;
  
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      admins: arrayRemove(userId)
    });
    
    alert(isOwnStatus ? 'Admin-Status entfernt.' : `@${username} ist kein Admin mehr.`);
    showGroupMembers(); // Refresh
  } catch (e) {
    console.error('Error removing admin:', e);
    alert('Fehler beim Entfernen.');
  }
}

// Show add member search
function showAddMemberSearch(groupId, groupData) {
  closeGroupMembers();
  
  // We'll reuse the user search modal
  const modal = document.getElementById('userSearchModal');
  modal.classList.remove('hidden');
  
  // Change title
  const modalHeader = modal.querySelector('.modal-header h2');
  modalHeader.textContent = '➕ Mitglied hinzufügen';
  
  const userList = document.getElementById('userList');
  userList.innerHTML = '<div class="spinner"></div>';
  
  // Load all users not in group
  loadUsersNotInGroup(groupId, groupData);
}

// Load users not in group
async function loadUsersNotInGroup(groupId, groupData) {
  try {
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    
    const members = groupData.members || [];
    const availableUsers = [];
    
    snapshot.forEach(docSnap => {
      const userId = docSnap.id;
      if (!members.includes(userId)) {
        const data = docSnap.data();
        availableUsers.push({
          uid: userId,
          username: data.username,
          email: data.email
        });
      }
    });
    
    renderAddMemberList(availableUsers, groupId);
  } catch (e) {
    console.error('Error loading users:', e);
  }
}

// Render add member list
function renderAddMemberList(users, groupId) {
  const userList = document.getElementById('userList');
  
  if (users.length === 0) {
    userList.innerHTML = '<div class="no-users">Alle Benutzer sind bereits Mitglied</div>';
    return;
  }
  
  userList.innerHTML = '';
  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.onclick = () => {
      addMemberToGroup(groupId, user.uid, user.username);
      document.getElementById('userSearchModal').classList.add('hidden');
    };
    
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = user.username.charAt(0).toUpperCase();
    
    const details = document.createElement('div');
    details.className = 'user-details';
    
    const username = document.createElement('div');
    username.className = 'user-username';
    username.textContent = `@${user.username}`;
    
    const email = document.createElement('div');
    email.className = 'user-email';
    email.textContent = user.email;
    
    details.appendChild(username);
    details.appendChild(email);
    userItem.appendChild(avatar);
    userItem.appendChild(details);
    userList.appendChild(userItem);
  });
}

// Show group settings
function showGroupSettings(groupId, groupData) {
  closeGroupMembers();
  
  // Create settings modal (we'll add this to HTML later)
  const existingModal = document.getElementById('groupSettingsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'groupSettingsModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ Gruppeneinstellungen</h2>
        <button class="close-btn" onclick="document.getElementById('groupSettingsModal').remove();">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="editGroupName">Gruppenname</label>
          <input id="editGroupName" type="text" value="${groupData.name}" maxlength="50">
        </div>
        <div class="form-group">
          <label for="editGroupDesc">Beschreibung</label>
          <textarea id="editGroupDesc" maxlength="200" rows="3">${groupData.description || ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="window.updateGroupSettings('${groupId}')">💾 Speichern</button>
        ${canDeleteGroup(groupData, auth.currentUser.uid) ? `
          <button class="btn btn-danger" style="margin-top: 16px;" onclick="window.deleteGroup('${groupId}')">🗑️ Gruppe löschen</button>
        ` : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Update group settings
export async function updateGroupSettings(groupId) {
  const name = document.getElementById('editGroupName').value.trim();
  const description = document.getElementById('editGroupDesc').value.trim();
  
  if (!name || name.length < 3) {
    alert('Gruppenname muss mindestens 3 Zeichen lang sein.');
    return;
  }
  
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      name,
      description
    });
    
    alert('Gruppeneinstellungen gespeichert!');
    document.getElementById('groupSettingsModal').remove();
    
    // Update chat header
    document.getElementById('groupChatName').textContent = `👥 ${name}`;
  } catch (e) {
    console.error('Error updating group:', e);
    alert('Fehler beim Speichern.');
  }
}

// Delete group
export async function deleteGroup(groupId) {
  if (!confirm('⚠️ Gruppe wirklich UNWIDERRUFLICH löschen?\n\nAlle Nachrichten gehen verloren!')) return;
  if (!confirm('Bist du dir GANZ SICHER?')) return;
  
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
    
    alert('Gruppe wurde gelöscht.');
    document.getElementById('groupSettingsModal').remove();
    window.closeGroupChat();
  } catch (e) {
    console.error('Error deleting group:', e);
    alert('Fehler beim Löschen.');
  }
}

console.log('✅ Group Members module loaded');
