import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, where, getDocs, limit, collectionGroup, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlZRSrjkYYP8KtycZOah8fX-RMMnYYPj4",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:427a7829345cde6ed8fb31",
  measurementId: "G-0W21RL0G06"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let unsubscribe;
let dmUnsubscribe;
let currentUserData = null;
const userCache = {};
let currentTab = 'groups';
let allUsers = [];
let currentDMUser = null; // Current DM chat partner
let hasResetUnreadForCurrentChat = false; // Track if we've reset unread for current chat

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
    // Today: just time
    return timeStr;
  } else if (msgDate.getTime() === yesterday.getTime()) {
    // Yesterday
    return `Gestern ${timeStr}`;
  } else {
    // Older: full date
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
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');
  
  // Update tab content
  document.getElementById('groupsTab').classList.toggle('hidden', tabName !== 'groups');
  document.getElementById('directTab').classList.toggle('hidden', tabName !== 'direct');
  
  // Load DM chat list when switching to direct tab
  if (tabName === 'direct') {
    loadDMChatList();
  }
};

// Load DM Chat List
async function loadDMChatList() {
  const chatListEl = document.getElementById('dmChatList');
  chatListEl.innerHTML = '<div class="spinner"></div>';
  
  console.log('=== Loading DM Chat List ===');
  console.log('Current user:', auth.currentUser?.uid);
  
  try {
    // Query all chats where current user is a participant
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    
    console.log('Total chats found:', snapshot.size);
    
    const chats = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      console.log('Chat data:', data);
      console.log('  -> unreadCount object:', data.unreadCount);
      
      // Find the other user
      const otherUserId = data.participants.find(uid => uid !== auth.currentUser.uid);
      
      if (otherUserId) {
        const otherUser = await loadUserData(otherUserId);
        
        if (otherUser) {
          // Get unread count for current user
          const unreadCount = (data.unreadCount && data.unreadCount[auth.currentUser.uid]) || 0;
          console.log('  -> Unread count for current user:', unreadCount);
          
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
    
    console.log('Chats to display:', chats.length);
    
    // Render chat list
    if (chats.length === 0) {
      console.log('No chats to display - showing placeholder');
      chatListEl.innerHTML = '<div class="dm-placeholder"><div class="placeholder-icon">💬</div><h3>Keine Chats</h3><p>Starte einen neuen Chat über den Button oben!</p></div>';
    } else {
      chatListEl.innerHTML = '';
      chats.forEach(chat => {
        console.log('Rendering chat:', chat.otherUsername, 'unread:', chat.unreadCount);
        
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
        
        // Add unread badge if count > 0
        if (chat.unreadCount > 0) {
          console.log('  -> Creating badge with count:', chat.unreadCount);
          const badge = document.createElement('div');
          badge.className = 'unread-badge';
          badge.textContent = chat.unreadCount > 99 ? '99+' : chat.unreadCount;
          rightSide.appendChild(badge);
        } else {
          console.log('  -> No badge (count is 0)');
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

// Create or update chat metadata
async function updateChatMetadata(chatId, lastMessage, participants, senderId) {
  const chatRef = doc(db, 'chats', chatId);
  
  console.log('=== updateChatMetadata called ===');
  console.log('  chatId:', chatId);
  console.log('  lastMessage:', lastMessage);
  console.log('  participants:', participants);
  console.log('  senderId:', senderId);
  
  try {
    // Get current chat data to preserve unread counts
    const chatSnap = await getDoc(chatRef);
    const currentData = chatSnap.exists() ? chatSnap.data() : {};
    
    console.log('  Current chat data:', currentData);
    console.log('  Current unreadCount:', currentData.unreadCount);
    
    // Initialize unreadCount if it doesn't exist
    const unreadCount = currentData.unreadCount || {};
    
    // Only update unread count if this is an actual message (senderId provided)
    if (senderId) {
      console.log('  senderId provided - updating counters');
      
      // Reset sender's count to 0 (they are actively in the chat)
      unreadCount[senderId] = 0;
      console.log('  Set sender count to 0:', senderId);
      
      // Increment unread count for all OTHER participants
      participants.forEach(uid => {
        if (uid !== senderId) {
          const oldCount = unreadCount[uid] || 0;
          unreadCount[uid] = oldCount + 1;
          console.log('  Incremented count for', uid, 'from', oldCount, 'to', unreadCount[uid]);
        }
      });
    } else {
      console.log('  No senderId - just initializing');
      // Just initialize unread counts to 0 if they don't exist (for new chats)
      participants.forEach(uid => {
        if (!(uid in unreadCount)) {
          unreadCount[uid] = 0;
          console.log('  Initialized count for', uid, 'to 0');
        }
      });
    }
    
    console.log('  Final unreadCount before save:', unreadCount);
    
    await setDoc(chatRef, {
      participants,
      lastMessage,
      lastMessageTime: serverTimestamp(),
      unreadCount
    }, { merge: true });
    
    console.log('  Chat metadata saved successfully');
  } catch (e) {
    console.error('Error updating chat metadata:', e);
  }
}

// Reset unread count when user opens chat
async function resetUnreadCount(chatId, userId) {
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const data = chatSnap.data();
      const unreadCount = data.unreadCount || {};
      
      // Only reset if there are unread messages
      if (unreadCount[userId] > 0) {
        unreadCount[userId] = 0;
        
        console.log('Resetting unread count for user:', userId, 'new unreadCount:', unreadCount);
        
        await updateDoc(chatRef, {
          unreadCount
        });
      }
    }
  } catch (e) {
    console.error('Error resetting unread count:', e);
  }
}

// Start direct message by user ID and username
function startDirectMessageById(userId, username) {
  startDirectMessage({ uid: userId, username: username });
}

// User Search Modal
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

// Load all users from Firestore
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

// Render user list
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

// Filter users based on search input
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

// Create chat ID from two user IDs (always sorted)
function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

// Start direct message with user
async function startDirectMessage(user) {
  console.log('=== startDirectMessage called ===');
  console.log('  user:', user);
  
  closeUserSearch();
  currentDMUser = user;
  hasResetUnreadForCurrentChat = false;
  
  // Show DM chat view
  document.getElementById('dmListView').classList.add('hidden');
  document.getElementById('dmChatView').classList.remove('hidden');
  document.getElementById('dmChatUsername').textContent = `👤 @${user.username}`;
  
  // Create chat metadata if it doesn't exist (without senderId to not increment counter)
  const chatId = createChatId(auth.currentUser.uid, user.uid);
  console.log('  chatId:', chatId);
  
  // Check if chat exists, if not create it
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    console.log('  Chat does not exist, creating...');
    await updateChatMetadata(chatId, '', [auth.currentUser.uid, user.uid], null);
  } else {
    console.log('  Chat already exists');
  }
  
  // Reset unread count for current user when opening chat
  await resetUnreadCount(chatId, auth.currentUser.uid);
  hasResetUnreadForCurrentChat = true;
  
  // Load DM messages
  console.log('  Calling loadDMMessages...');
  loadDMMessages(user.uid);
}

// Close DM chat and return to list
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
  
  // Reload chat list to show updated last message
  loadDMChatList();
};

// Load DM messages
function loadDMMessages(otherUserId) {
  console.log('=== loadDMMessages called ===');
  console.log('  otherUserId:', otherUserId);
  console.log('  currentUser:', auth.currentUser?.uid);
  
  const chatId = createChatId(auth.currentUser.uid, otherUserId);
  console.log('  chatId:', chatId);
  console.log('  Collection path: directMessages/' + chatId + '/messages');
  
  // Query in descending order to get the latest 50 messages
  const q = query(
    collection(db, 'directMessages', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  console.log('  Setting up onSnapshot listener...');
  
  dmUnsubscribe = onSnapshot(q, async (snapshot) => {
    console.log('=== onSnapshot triggered ===');
    console.log('  snapshot.size:', snapshot.size);
    console.log('  snapshot.empty:', snapshot.empty);
    
    const msgs = document.getElementById('dmMessages');
    console.log('  dmMessages element found:', !!msgs);
    console.log('  Current message count:', msgs.children.length);
    
    if (msgs.children.length === 0) {
      console.log('  Initial load - rendering all messages');
      msgs.innerHTML = '';
      
      // Reverse the array since we queried in DESC order but want to display in ASC order
      const docsArray = snapshot.docs.slice().reverse();
      
      for (const docSnap of docsArray) {
        console.log('  Rendering message:', docSnap.id);
        await appendDMMessage(docSnap);
      }
    } else {
      console.log('  Incremental update');
      snapshot.docChanges().forEach(async (change) => {
        console.log('  Change type:', change.type, 'doc:', change.doc.id);
        if (change.type === 'added') {
          if (!document.querySelector(`[data-dm-msg-id="${change.doc.id}"]`)) {
            console.log('  Adding new message:', change.doc.id);
            await prependDMMessage(change.doc);
            
            // Reset unread count when new message arrives while chat is open
            if (!hasResetUnreadForCurrentChat) {
              await resetUnreadCount(chatId, auth.currentUser.uid);
              hasResetUnreadForCurrentChat = true;
            }
          } else {
            console.log('  Message already exists, skipping:', change.doc.id);
          }
        } else if (change.type === 'modified') {
          console.log('  Updating message:', change.doc.id);
          // Update message when timestamp is added by server
          await updateDMMessage(change.doc);
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
    console.log('  Scrolled to bottom');
  }, (error) => {
    console.error('=== onSnapshot ERROR ===');
    console.error('  Error:', error);
    console.error('  Error code:', error.code);
    console.error('  Error message:', error.message);
  });
  
  console.log('  onSnapshot listener registered');
}

// Prepend single DM message (for new messages when query is DESC)
async function prependDMMessage(docSnap) {
  console.log('=== prependDMMessage called ===');
  console.log('  doc.id:', docSnap.id);
  
  const data = docSnap.data();
  console.log('  Message data:', data);
  
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-dm-msg-id', docSnap.id);
  
  let username = data.username || 'Unbekannt';
  if (!data.username && data.uid) {
    const userData = await loadUserData(data.uid);
    username = userData?.username || data.uid.slice(0, 8);
  }
  console.log('  Username:', username);
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = `@${username}`;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'text';
  textSpan.textContent = data.text;
  
  div.appendChild(usernameSpan);
  div.appendChild(textSpan);
  
  // Add timestamp
  if (data.createdAt) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    div.appendChild(timeSpan);
  }
  
  const msgs = document.getElementById('dmMessages');
  msgs.appendChild(div); // Append because messages are already in correct order
  console.log('  Message appended to DOM');
}

// Update existing DM message (for timestamp updates)
async function updateDMMessage(docSnap) {
  console.log('=== updateDMMessage called ===');
  console.log('  doc.id:', docSnap.id);
  
  const existingMsg = document.querySelector(`[data-dm-msg-id="${docSnap.id}"]`);
  if (!existingMsg) {
    console.log('  Message element not found');
    return;
  }
  
  const data = docSnap.data();
  console.log('  Message data:', data);
  
  // Check if timestamp element already exists
  let timeSpan = existingMsg.querySelector('.time');
  
  if (data.createdAt && !timeSpan) {
    // Add timestamp if it doesn't exist
    console.log('  Adding timestamp');
    timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    existingMsg.appendChild(timeSpan);
  } else if (data.createdAt && timeSpan) {
    // Update timestamp if it exists
    console.log('  Updating timestamp');
    timeSpan.textContent = formatTimestamp(data.createdAt);
  }
}

// Append single DM message
async function appendDMMessage(docSnap) {
  console.log('=== appendDMMessage called ===');
  console.log('  doc.id:', docSnap.id);
  
  const data = docSnap.data();
  console.log('  Message data:', data);
  
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-dm-msg-id', docSnap.id);
  
  let username = data.username || 'Unbekannt';
  if (!data.username && data.uid) {
    const userData = await loadUserData(data.uid);
    username = userData?.username || data.uid.slice(0, 8);
  }
  console.log('  Username:', username);
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = `@${username}`;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'text';
  textSpan.textContent = data.text;
  
  div.appendChild(usernameSpan);
  div.appendChild(textSpan);
  
  // Add timestamp
  if (data.createdAt) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    div.appendChild(timeSpan);
  }
  
  const msgs = document.getElementById('dmMessages');
  msgs.appendChild(div);
  console.log('  Message appended to DOM');
}

// Send DM Message
window.sendDMMessage = async () => {
  const text = document.getElementById('dmMessageInput').value.trim();
  if (!text || !auth.currentUser || !currentUserData || !currentDMUser) return;
  
  console.log('=== sendDMMessage called ===');
  console.log('  text:', text);
  console.log('  currentUser:', auth.currentUser.uid);
  console.log('  currentDMUser:', currentDMUser.uid);
  
  try {
    const chatId = createChatId(auth.currentUser.uid, currentDMUser.uid);
    console.log('  chatId:', chatId);
    
    // Add message
    await addDoc(collection(db, 'directMessages', chatId, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      createdAt: serverTimestamp()
    });
    console.log('  Message added to Firestore');
    
    // Update chat metadata with sender ID (this will reset sender's count to 0 and increment receiver's)
    console.log('  Calling updateChatMetadata with senderId:', auth.currentUser.uid);
    await updateChatMetadata(chatId, text, [auth.currentUser.uid, currentDMUser.uid], auth.currentUser.uid);
    console.log('  updateChatMetadata completed');
    
    document.getElementById('dmMessageInput').value = '';
  } catch (e) {
    console.error('Error sending DM:', e);
    alert('Fehler beim Senden der Nachricht.');
  }
};

// Error Display
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Registration
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

// Login
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

// Username Setup
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
    loadMessages();
    document.getElementById('userInfo').textContent = `@${username}`;
    
  } catch (e) {
    showError('usernameError', 'Fehler beim Speichern: ' + e.message);
  }
};

// Logout
window.logout = async () => {
  if (unsubscribe) unsubscribe();
  if (dmUnsubscribe) dmUnsubscribe();
  await signOut(auth);
  currentUserData = null;
  currentDMUser = null;
  currentTab = 'groups';
  allUsers = [];
  hasResetUnreadForCurrentChat = false;
  Object.keys(userCache).forEach(key => delete userCache[key]);
};

// Load User Data
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

// Send Message
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

// Load Messages
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
          // Update message when timestamp is added by server
          await updateMessage(change.doc);
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
  });
}

// Update existing message (for timestamp updates)
async function updateMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-msg-id="${docSnap.id}"]`);
  if (!existingMsg) return;
  
  const data = docSnap.data();
  
  // Check if timestamp element already exists
  let timeSpan = existingMsg.querySelector('.time');
  
  if (data.createdAt && !timeSpan) {
    // Add timestamp if it doesn't exist
    timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    existingMsg.appendChild(timeSpan);
  } else if (data.createdAt && timeSpan) {
    // Update timestamp if it exists
    timeSpan.textContent = formatTimestamp(data.createdAt);
  }
}

// Helper function to append a single message
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
  
  // Add timestamp
  if (data.createdAt) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    div.appendChild(timeSpan);
  }
  
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userData = await loadUserData(user.uid);
    
    if (userData && userData.username) {
      currentUserData = userData;
      showScreen('chatScreen');
      loadMessages();
      document.getElementById('userInfo').textContent = `@${userData.username}`;
    } else {
      showScreen('usernameScreen');
    }
  } else {
    if (unsubscribe) unsubscribe();
    if (dmUnsubscribe) dmUnsubscribe();
    currentUserData = null;
    showScreen('loginScreen');
  }
});
