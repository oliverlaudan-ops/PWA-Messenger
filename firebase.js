import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, where, getDocs, limit, collectionGroup, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Firebase configuration - NEW WEB APP V2
// Note: Firebase Web API keys are designed to be public
// Security is enforced through Firestore Rules and API restrictions in Google Cloud Console
const firebaseConfig = {
  apiKey: "AIzaSyDlaUIHlW8WXYtOw41_41HQvIey3zVblgI",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:171949632144cfa4d8fb31",
  measurementId: "G-2H9R8P1KS8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let unsubscribe;
let dmUnsubscribe;
let groupUnsubscribe;
let currentUserData = null;
const userCache = {};
let currentTab = 'groups';
let allUsers = [];
let currentDMUser = null;
let currentGroup = null;
let hasResetUnreadForCurrentChat = false;

// Format timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const timeStr = date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (msgDate.getTime() === today.getTime()) {
    return timeStr;
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return `Gestern ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${dateStr} ${timeStr}`;
  }
}

// Screen Management
function showScreen(screenId) {
  ['loginScreen', 'registerScreen', 'usernameScreen', 'chatScreen'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

window.showLogin = () => showScreen('loginScreen');
window.showRegister = () => showScreen('registerScreen');

// Tab Switching
window.switchTab = (tabName) => {
  currentTab = tabName;
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');
  
  document.getElementById('groupsTab').classList.toggle('hidden', tabName !== 'groups');
  document.getElementById('directTab').classList.toggle('hidden', tabName !== 'direct');
  
  if (tabName === 'direct') {
    loadDMChatList();
  } else if (tabName === 'groups') {
    loadGroupList();
  }
};

// ============================================
// GROUP FUNCTIONS
// ============================================

// Show Create Group Modal
window.showCreateGroup = () => {
  const modal = document.getElementById('createGroupModal');
  modal.classList.remove('hidden');
  document.getElementById('groupNameInput').value = '';
  document.getElementById('groupDescInput').value = '';
  document.getElementById('createGroupError').classList.add('hidden');
  document.getElementById('groupNameInput').focus();
};

// Close Create Group Modal
window.closeCreateGroup = () => {
  document.getElementById('createGroupModal').classList.add('hidden');
};

// Create Group
window.createGroup = async () => {
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
};

// Load Group List
async function loadGroupList() {
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
async function openGroupChat(groupId, groupName) {
  currentGroup = { groupId, groupName };
  hasResetUnreadForCurrentChat = false;
  
  document.getElementById('groupListView').classList.add('hidden');
  document.getElementById('groupChatView').classList.remove('hidden');
  document.getElementById('groupChatName').textContent = `👥 ${groupName}`;
  
  // Load group data for member count
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  if (groupDoc.exists()) {
    const data = groupDoc.data();
    const memberCount = data.members ? data.members.length : 0;
    document.getElementById('groupChatMembers').textContent = `${memberCount} Mitglieder`;
  }
  
  // Reset unread count
  await resetGroupUnreadCount(groupId, auth.currentUser.uid);
  hasResetUnreadForCurrentChat = true;
  
  // Load group messages
  loadGroupMessages(groupId);
}

// Close Group Chat
window.closeGroupChat = () => {
  if (groupUnsubscribe) {
    groupUnsubscribe();
    groupUnsubscribe = null;
  }
  
  currentGroup = null;
  hasResetUnreadForCurrentChat = false;
  document.getElementById('groupChatView').classList.add('hidden');
  document.getElementById('groupListView').classList.remove('hidden');
  document.getElementById('groupMessages').innerHTML = '';
  document.getElementById('groupMessageInput').value = '';
  
  loadGroupList();
};

// Load Group Messages
function loadGroupMessages(groupId) {
  const q = query(
    collection(db, 'groupMessages', groupId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  groupUnsubscribe = onSnapshot(q, async (snapshot) => {
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
              hasResetUnreadForCurrentChat = true;
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
window.sendGroupMessage = async () => {
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
};

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

// ============================================
// DM FUNCTIONS
// ============================================

async function loadDMChatList() {
  const chatListEl = document.getElementById('dmChatList');
  chatListEl.innerHTML = '<div class="spinner"></div>';
  
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const chats = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const otherUserId = data.participants.find(uid => uid !== auth.currentUser.uid);
      
      if (otherUserId) {
        const otherUser = await loadUserData(otherUserId);
        
        if (otherUser) {
          const unreadCount = (data.unreadCount && data.unreadCount[auth.currentUser.uid]) || 0;
          
          chats.push({
            chatId: docSnap.id,
            otherUserId,
            otherUsername: otherUser.username,
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime,
            unreadCount
          });
        }
      }
    }
    
    if (chats.length === 0) {
      chatListEl.innerHTML = '<div class="dm-placeholder"><div class="placeholder-icon">💬</div><h3>Keine Chats</h3><p>Starte einen neuen Chat über den Button oben!</p></div>';
    } else {
      chatListEl.innerHTML = '';
      chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'user-item';
        chatItem.onclick = () => startDirectMessageById(chat.otherUserId, chat.otherUsername);
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = chat.otherUsername.charAt(0).toUpperCase();
        
        const details = document.createElement('div');
        details.className = 'user-details';
        details.style.flex = '1';
        
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.marginBottom = '4px';
        
        const username = document.createElement('div');
        username.className = 'user-username';
        username.textContent = `@${chat.otherUsername}`;
        
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '8px';
        
        const time = document.createElement('div');
        time.className = 'user-email';
        time.style.fontSize = '11px';
        time.textContent = chat.lastMessageTime ? formatTimestamp(chat.lastMessageTime) : '';
        
        rightSide.appendChild(time);
        
        if (chat.unreadCount > 0) {
          const badge = document.createElement('div');
          badge.className = 'unread-badge';
          badge.textContent = chat.unreadCount > 99 ? '99+' : chat.unreadCount;
          rightSide.appendChild(badge);
        }
        
        topRow.appendChild(username);
        topRow.appendChild(rightSide);
        
        const preview = document.createElement('div');
        preview.className = 'user-email';
        preview.textContent = chat.lastMessage.length > 50 
          ? chat.lastMessage.substring(0, 50) + '...' 
          : chat.lastMessage;
        
        details.appendChild(topRow);
        details.appendChild(preview);
        chatItem.appendChild(avatar);
        chatItem.appendChild(details);
        chatListEl.appendChild(chatItem);
      });
    }
  } catch (e) {
    console.error('Error loading chat list:', e);
    chatListEl.innerHTML = '<div class="no-users">Fehler beim Laden der Chats</div>';
  }
}

async function updateChatMetadata(chatId, lastMessage, participants, senderId) {
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    const chatSnap = await getDoc(chatRef);
    const currentData = chatSnap.exists() ? chatSnap.data() : {};
    const unreadCount = currentData.unreadCount || {};
    
    if (senderId) {
      unreadCount[senderId] = 0;
      participants.forEach(uid => {
        if (uid !== senderId) {
          unreadCount[uid] = (unreadCount[uid] || 0) + 1;
        }
      });
    } else {
      participants.forEach(uid => {
        if (!(uid in unreadCount)) {
          unreadCount[uid] = 0;
        }
      });
    }
    
    await setDoc(chatRef, {
      participants,
      lastMessage,
      lastMessageTime: serverTimestamp(),
      unreadCount
    }, { merge: true });
  } catch (e) {
    console.error('Error updating chat metadata:', e);
  }
}

async function resetUnreadCount(chatId, userId) {
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const data = chatSnap.data();
      const unreadCount = data.unreadCount || {};
      
      if (unreadCount[userId] > 0) {
        unreadCount[userId] = 0;
        await updateDoc(chatRef, { unreadCount });
      }
    }
  } catch (e) {
    console.error('Error resetting unread count:', e);
  }
}

function startDirectMessageById(userId, username) {
  startDirectMessage({ uid: userId, username: username });
}

window.showUserSearch = async () => {
  const modal = document.getElementById('userSearchModal');
  modal.classList.remove('hidden');
  
  const userList = document.getElementById('userList');
  userList.innerHTML = '<div class="spinner"></div>';
  
  await loadAllUsers();
  renderUserList(allUsers);
  
  document.getElementById('userSearchInput').value = '';
  document.getElementById('userSearchInput').focus();
};

window.closeUserSearch = () => {
  document.getElementById('userSearchModal').classList.add('hidden');
};

async function loadAllUsers() {
  try {
    const usersQuery = query(collection(db, 'users'), orderBy('username'));
    const snapshot = await getDocs(usersQuery);
    
    allUsers = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (docSnap.id !== auth.currentUser.uid) {
        allUsers.push({
          uid: docSnap.id,
          username: data.username,
          email: data.email
        });
      }
    });
  } catch (e) {
    console.error('Error loading users:', e);
  }
}

function renderUserList(users) {
  const userList = document.getElementById('userList');
  
  if (users.length === 0) {
    userList.innerHTML = '<div class="no-users">Keine Benutzer gefunden</div>';
    return;
  }
  
  userList.innerHTML = '';
  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.onclick = () => startDirectMessage(user);
    
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

window.filterUsers = () => {
  const searchTerm = document.getElementById('userSearchInput').value.toLowerCase().trim();
  
  if (!searchTerm) {
    renderUserList(allUsers);
    return;
  }
  
  const filtered = allUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm) ||
    user.email.toLowerCase().includes(searchTerm)
  );
  
  renderUserList(filtered);
};

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

async function startDirectMessage(user) {
  closeUserSearch();
  currentDMUser = user;
  hasResetUnreadForCurrentChat = false;
  
  document.getElementById('dmListView').classList.add('hidden');
  document.getElementById('dmChatView').classList.remove('hidden');
  document.getElementById('dmChatUsername').textContent = `👤 @${user.username}`;
  
  const chatId = createChatId(auth.currentUser.uid, user.uid);
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await updateChatMetadata(chatId, '', [auth.currentUser.uid, user.uid], null);
  }
  
  await resetUnreadCount(chatId, auth.currentUser.uid);
  hasResetUnreadForCurrentChat = true;
  
  loadDMMessages(user.uid);
}

window.closeDMChat = () => {
  if (dmUnsubscribe) {
    dmUnsubscribe();
    dmUnsubscribe = null;
  }
  
  currentDMUser = null;
  hasResetUnreadForCurrentChat = false;
  document.getElementById('dmChatView').classList.add('hidden');
  document.getElementById('dmListView').classList.remove('hidden');
  document.getElementById('dmMessages').innerHTML = '';
  document.getElementById('dmMessageInput').value = '';
  
  loadDMChatList();
};

function loadDMMessages(otherUserId) {
  const chatId = createChatId(auth.currentUser.uid, otherUserId);
  
  const q = query(
    collection(db, 'directMessages', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  dmUnsubscribe = onSnapshot(q, async (snapshot) => {
    const msgs = document.getElementById('dmMessages');
    
    if (msgs.children.length === 0) {
      msgs.innerHTML = '';
      const docsArray = snapshot.docs.slice().reverse();
      for (const docSnap of docsArray) {
        await appendDMMessage(docSnap);
      }
    } else {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          if (!document.querySelector(`[data-dm-msg-id="${change.doc.id}"]`)) {
            await appendDMMessage(change.doc);
            
            if (!hasResetUnreadForCurrentChat) {
              await resetUnreadCount(chatId, auth.currentUser.uid);
              hasResetUnreadForCurrentChat = true;
            }
          }
        } else if (change.type === 'modified') {
          await updateDMMessage(change.doc);
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
  }, (error) => {
    console.error('Error in DM messages listener:', error);
  });
}

async function updateDMMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-dm-msg-id="${docSnap.id}"]`);
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

async function appendDMMessage(docSnap) {
  const data = docSnap.data();
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-dm-msg-id', docSnap.id);
  
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
  
  const msgs = document.getElementById('dmMessages');
  msgs.appendChild(div);
}

window.sendDMMessage = async () => {
  const text = document.getElementById('dmMessageInput').value.trim();
  if (!text || !auth.currentUser || !currentUserData || !currentDMUser) return;
  
  try {
    const chatId = createChatId(auth.currentUser.uid, currentDMUser.uid);
    
    await addDoc(collection(db, 'directMessages', chatId, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      createdAt: serverTimestamp()
    });
    
    await updateChatMetadata(chatId, text, [auth.currentUser.uid, currentDMUser.uid], auth.currentUser.uid);
    
    document.getElementById('dmMessageInput').value = '';
  } catch (e) {
    console.error('Error sending DM:', e);
    alert('Fehler beim Senden der Nachricht.');
  }
};

// ============================================
// AUTH & USER FUNCTIONS
// ============================================

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

window.signup = async () => {
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  
  if (!email || !password) {
    showError('registerError', 'Bitte fülle alle Felder aus.');
    return;
  }
  
  if (password.length < 6) {
    showError('registerError', 'Passwort muss mindestens 6 Zeichen lang sein.');
    return;
  }
  
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    let message = 'Registrierung fehlgeschlagen.';
    if (e.code === 'auth/email-already-in-use') message = 'E-Mail bereits registriert.';
    if (e.code === 'auth/invalid-email') message = 'Ungültige E-Mail-Adresse.';
    if (e.code === 'auth/weak-password') message = 'Passwort zu schwach.';
    showError('registerError', message);
  }
};

window.login = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showError('loginError', 'Bitte fülle alle Felder aus.');
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    let message = 'Login fehlgeschlagen.';
    if (e.code === 'auth/user-not-found') message = 'Benutzer nicht gefunden.';
    if (e.code === 'auth/wrong-password') message = 'Falsches Passwort.';
    if (e.code === 'auth/invalid-email') message = 'Ungültige E-Mail-Adresse.';
    if (e.code === 'auth/invalid-credential') message = 'Ungültige Anmeldedaten.';
    showError('loginError', message);
  }
};

window.setUsername = async () => {
  const username = document.getElementById('usernameInput').value.trim().toLowerCase();
  
  if (!username) {
    showError('usernameError', 'Bitte gib einen Benutzernamen ein.');
    return;
  }
  
  if (username.length < 3 || username.length > 20) {
    showError('usernameError', 'Benutzername muss 3-20 Zeichen lang sein.');
    return;
  }
  
  if (!/^[a-z0-9_]+$/.test(username)) {
    showError('usernameError', 'Nur Kleinbuchstaben, Zahlen und _ erlaubt.');
    return;
  }
  
  try {
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(usernameQuery);
    
    if (!snapshot.empty) {
      showError('usernameError', 'Benutzername bereits vergeben.');
      return;
    }
    
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      username: username,
      email: auth.currentUser.email,
      createdAt: serverTimestamp()
    });
    
    currentUserData = { username };
    showScreen('chatScreen');
    loadGroupList();
    document.getElementById('userInfo').textContent = `@${username}`;
    
  } catch (e) {
    showError('usernameError', 'Fehler beim Speichern: ' + e.message);
  }
};

window.logout = async () => {
  if (unsubscribe) unsubscribe();
  if (dmUnsubscribe) dmUnsubscribe();
  if (groupUnsubscribe) groupUnsubscribe();
  await signOut(auth);
  currentUserData = null;
  currentDMUser = null;
  currentGroup = null;
  currentTab = 'groups';
  allUsers = [];
  hasResetUnreadForCurrentChat = false;
  Object.keys(userCache).forEach(key => delete userCache[key]);
};

async function loadUserData(uid) {
  if (userCache[uid]) return userCache[uid];
  
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userCache[uid] = data;
      return data;
    }
  } catch (e) {
    console.error('Error loading user data:', e);
  }
  return null;
}

window.sendMessage = async () => {
  const text = document.getElementById('messageInput').value.trim();
  if (!text || !auth.currentUser || !currentUserData) return;
  
  try {
    await addDoc(collection(db, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      createdAt: serverTimestamp()
    });
    document.getElementById('messageInput').value = '';
  } catch (e) {
    console.error('Error sending message:', e);
    alert('Fehler beim Senden der Nachricht.');
  }
};

function loadMessages() {
  const q = query(collection(db, 'messages'), orderBy('createdAt'), limit(50));
  
  unsubscribe = onSnapshot(q, async (snapshot) => {
    const msgs = document.getElementById('messages');
    
    if (msgs.children.length === 0) {
      msgs.innerHTML = '';
      for (const docSnap of snapshot.docs) {
        await appendMessage(docSnap);
      }
    } else {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          if (!document.querySelector(`[data-msg-id="${change.doc.id}"]`)) {
            await appendMessage(change.doc);
          }
        } else if (change.type === 'modified') {
          await updateMessage(change.doc);
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
  });
}

async function updateMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-msg-id="${docSnap.id}"]`);
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

async function appendMessage(docSnap) {
  const data = docSnap.data();
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-msg-id', docSnap.id);
  
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
  
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userData = await loadUserData(user.uid);
    
    if (userData && userData.username) {
      currentUserData = userData;
      showScreen('chatScreen');
      loadGroupList();
      document.getElementById('userInfo').textContent = `@${userData.username}`;
    } else {
      showScreen('usernameScreen');
    }
  } else {
    if (unsubscribe) unsubscribe();
    if (dmUnsubscribe) dmUnsubscribe();
    if (groupUnsubscribe) groupUnsubscribe();
    currentUserData = null;
    showScreen('loginScreen');
  }
});
