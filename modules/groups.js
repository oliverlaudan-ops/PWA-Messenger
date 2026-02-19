// modules/groups.js
// Group chat functionality

import { db, auth, currentUserData, currentGroup, setCurrentGroup, setGroupUnsubscribe, setHasResetUnread, groupUnsubscribe, hasResetUnreadForCurrentChat } from './state.js';
import { formatTimestamp, showError } from './ui.js';
import { loadUserData } from './users.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Show Create Group Modal
export function showCreateGroup() {
  const modal = document.getElementById('createGroupModal');
  modal.classList.remove('hidden');
  document.getElementById('groupNameInput').value = '';
  document.getElementById('groupDescInput').value = '';
  document.getElementById('createGroupError').classList.add('hidden');
  document.getElementById('groupNameInput').focus();
}

// Close Create Group Modal
export function closeCreateGroup() {
  document.getElementById('createGroupModal').classList.add('hidden');
}

// Create Group
export async function createGroup() {
  const name = document.getElementById('groupNameInput').value.trim();
  const description = document.getElementById('groupDescInput').value.trim();
  
  if (!name) {
    showError('createGroupError', 'Bitte gib einen Gruppennamen ein.');
    return;
  }
  
  if (name.length < 3 || name.length > 50) {
    showError('createGroupError', 'Gruppenname muss 3-50 Zeichen lang sein.');
    return;
  }
  
  try {
    const groupData = {
      name,
      description: description || '',
      createdBy: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      admins: [auth.currentUser.uid],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: { [auth.currentUser.uid]: 0 }
    };
    
    await addDoc(collection(db, 'groups'), groupData);
    
    closeCreateGroup();
    loadGroupList();
  } catch (e) {
    console.error('Error creating group:', e);
    showError('createGroupError', 'Fehler beim Erstellen der Gruppe.');
  }
}

// Load Group List
export async function loadGroupList() {
  const groupListEl = document.getElementById('groupList');
  groupListEl.innerHTML = '<div class="spinner"></div>';
  
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where('members', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const groups = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const unreadCount = (data.unreadCount && data.unreadCount[auth.currentUser.uid]) || 0;
      
      groups.push({
        groupId: docSnap.id,
        name: data.name,
        description: data.description || '',
        lastMessage: data.lastMessage || '',
        lastMessageTime: data.lastMessageTime,
        memberCount: data.members ? data.members.length : 0,
        unreadCount
      });
    }
    
    if (groups.length === 0) {
      groupListEl.innerHTML = '<div class="dm-placeholder"><div class="placeholder-icon">👥</div><h3>Keine Gruppen</h3><p>Erstelle eine neue Gruppe über den Button oben!</p></div>';
    } else {
      groupListEl.innerHTML = '';
      groups.forEach(group => {
        const groupItem = document.createElement('div');
        groupItem.className = 'user-item';
        groupItem.onclick = () => openGroupChat(group.groupId, group.name);
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = group.name.charAt(0).toUpperCase();
        
        const details = document.createElement('div');
        details.className = 'user-details';
        details.style.flex = '1';
        
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.marginBottom = '4px';
        
        const groupName = document.createElement('div');
        groupName.className = 'user-username';
        groupName.textContent = group.name;
        
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '8px';
        
        const time = document.createElement('div');
        time.className = 'user-email';
        time.style.fontSize = '11px';
        time.textContent = group.lastMessageTime ? formatTimestamp(group.lastMessageTime) : '';
        
        rightSide.appendChild(time);
        
        if (group.unreadCount > 0) {
          const badge = document.createElement('div');
          badge.className = 'unread-badge';
          badge.textContent = group.unreadCount > 99 ? '99+' : group.unreadCount;
          rightSide.appendChild(badge);
        }
        
        topRow.appendChild(groupName);
        topRow.appendChild(rightSide);
        
        const preview = document.createElement('div');
        preview.className = 'user-email';
        preview.textContent = group.lastMessage
          ? (group.lastMessage.length > 50 ? group.lastMessage.substring(0, 50) + '...' : group.lastMessage)
          : `${group.memberCount} Mitglieder`;
        
        details.appendChild(topRow);
        details.appendChild(preview);
        groupItem.appendChild(avatar);
        groupItem.appendChild(details);
        groupListEl.appendChild(groupItem);
      });
    }
  } catch (e) {
    console.error('Error loading group list:', e);
    groupListEl.innerHTML = '<div class="no-users">Fehler beim Laden der Gruppen</div>';
  }
}

// Open Group Chat
export async function openGroupChat(groupId, groupName) {
  setCurrentGroup({ groupId, groupName });
  setHasResetUnread(false);
  
  // Set global variable for mute functionality
  window.currentGroupId = groupId;
  
  document.getElementById('groupListView').classList.add('hidden');
  document.getElementById('groupChatView').classList.remove('hidden');
  document.getElementById('groupChatName').textContent = `👥 ${groupName}`;
  
  // Set data attribute for members modal
  document.getElementById('groupChatView').dataset.groupId = groupId;
  
  // Initialize mute button
  if (window.initMuteButton) {
    window.initMuteButton(groupId);
  }
  
  // Load group data for member count
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  if (groupDoc.exists()) {
    const data = groupDoc.data();
    const memberCount = data.members ? data.members.length : 0;
    document.getElementById('groupChatMembers').textContent = `${memberCount} Mitglieder`;
  }
  
  // Reset unread count
  await resetGroupUnreadCount(groupId, auth.currentUser.uid);
  setHasResetUnread(true);
  
  // Load group messages
  loadGroupMessages(groupId);
}

// Close Group Chat
export function closeGroupChat() {
  if (groupUnsubscribe) {
    groupUnsubscribe();
    setGroupUnsubscribe(null);
  }
  
  // Clear global variable
  window.currentGroupId = null;
  
  setCurrentGroup(null);
  setHasResetUnread(false);
  document.getElementById('groupChatView').classList.add('hidden');
  document.getElementById('groupListView').classList.remove('hidden');
  document.getElementById('groupMessages').innerHTML = '';
  document.getElementById('groupMessageInput').value = '';
  
  loadGroupList();
}

// Load Group Messages
function loadGroupMessages(groupId) {
  const q = query(
    collection(db, 'groupMessages', groupId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  const unsubscribeFn = onSnapshot(q, async (snapshot) => {
    const msgs = document.getElementById('groupMessages');
    
    if (msgs.children.length === 0) {
      msgs.innerHTML = '';
      const docsArray = snapshot.docs.slice().reverse();
      for (const docSnap of docsArray) {
        await appendGroupMessage(docSnap);
      }
    } else {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          if (!document.querySelector(`[data-group-msg-id="${change.doc.id}"]`)) {
            await appendGroupMessage(change.doc);
            
            if (!hasResetUnreadForCurrentChat) {
              await resetGroupUnreadCount(groupId, auth.currentUser.uid);
              setHasResetUnread(true);
            }
          }
        } else if (change.type === 'modified') {
          await updateGroupMessage(change.doc);
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
  }, (error) => {
    console.error('Error in group messages listener:', error);
  });
  
  setGroupUnsubscribe(unsubscribeFn);
}

// Append Group Message
async function appendGroupMessage(docSnap) {
  const data = docSnap.data();
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-group-msg-id', docSnap.id);
  
  let username = data.username || 'Unbekannt';
  if (!data.username && data.uid) {
    const userData = await loadUserData(data.uid);
    username = userData?.username || data.uid.slice(0, 8);
  }
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = `@${username}`;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'text';
  textSpan.textContent = data.text;
  
  div.appendChild(usernameSpan);
  div.appendChild(textSpan);
  
  if (data.createdAt) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    div.appendChild(timeSpan);
  }
  
  const msgs = document.getElementById('groupMessages');
  msgs.appendChild(div);
}

// Update Group Message
async function updateGroupMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-group-msg-id="${docSnap.id}"]`);
  if (!existingMsg) return;
  
  const data = docSnap.data();
  let timeSpan = existingMsg.querySelector('.time');
  
  if (data.createdAt && !timeSpan) {
    timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    existingMsg.appendChild(timeSpan);
  } else if (data.createdAt && timeSpan) {
    timeSpan.textContent = formatTimestamp(data.createdAt);
  }
}

// Send Group Message
export async function sendGroupMessage() {
  const text = document.getElementById('groupMessageInput').value.trim();
  if (!text || !auth.currentUser || !currentUserData || !currentGroup) return;
  
  try {
    const { groupId } = currentGroup;
    
    await addDoc(collection(db, 'groupMessages', groupId, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      createdAt: serverTimestamp()
    });
    
    await updateGroupMetadata(groupId, text, auth.currentUser.uid);
    
    document.getElementById('groupMessageInput').value = '';
  } catch (e) {
    console.error('Error sending group message:', e);
    alert('Fehler beim Senden der Nachricht.');
  }
}

// Update Group Metadata
async function updateGroupMetadata(groupId, lastMessage, senderId) {
  const groupRef = doc(db, 'groups', groupId);
  
  try {
    const groupSnap = await getDoc(groupRef);
    const currentData = groupSnap.exists() ? groupSnap.data() : {};
    
    const unreadCount = currentData.unreadCount || {};
    const members = currentData.members || [];
    
    if (senderId) {
      unreadCount[senderId] = 0;
      members.forEach(uid => {
        if (uid !== senderId) {
          unreadCount[uid] = (unreadCount[uid] || 0) + 1;
        }
      });
    }
    
    await updateDoc(groupRef, {
      lastMessage,
      lastMessageTime: serverTimestamp(),
      unreadCount
    });
  } catch (e) {
    console.error('Error updating group metadata:', e);
  }
}

// Reset Group Unread Count
async function resetGroupUnreadCount(groupId, userId) {
  const groupRef = doc(db, 'groups', groupId);
  
  try {
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
      const data = groupSnap.data();
      const unreadCount = data.unreadCount || {};
      
      if (unreadCount[userId] > 0) {
        unreadCount[userId] = 0;
        await updateDoc(groupRef, { unreadCount });
      }
    }
  } catch (e) {
    console.error('Error resetting group unread count:', e);
  }
}

console.log('✅ Groups module loaded');
