import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
let currentUserData = null;
const userCache = {}; // Cache für Usernames
let currentTab = 'groups'; // Track current tab
let allUsers = []; // Store all users for filtering

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
};

// User Search Modal
window.showUserSearch = async () => {
  const modal = document.getElementById('userSearchModal');
  modal.classList.remove('hidden');
  
  const userList = document.getElementById('userList');
  userList.innerHTML = '<div class="spinner"></div>';
  
  // Load all users
  await loadAllUsers();
  renderUserList(allUsers);
  
  // Focus search input
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
      // Nicht sich selbst anzeigen
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

// Start direct message with user
function startDirectMessage(user) {
  closeUserSearch();
  alert(`DM-Chat mit @${user.username} starten kommt im nächsten Schritt! 🚀`);
  // Schritt 3 wird hier den Chat starten
}

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
    // Auth State Handler übernimmt
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
    // Auth State Handler übernimmt
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
    // Prüfen ob Username bereits existiert
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(usernameQuery);
    
    if (!snapshot.empty) {
      showError('usernameError', 'Benutzername bereits vergeben.');
      return;
    }
    
    // User-Profil erstellen
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
  await signOut(auth);
  currentUserData = null;
  currentTab = 'groups';
  allUsers = [];
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

// Load Messages - Optimized to only add new messages
function loadMessages() {
  // Lade initial die letzten 50 Nachrichten
  const q = query(collection(db, 'messages'), orderBy('createdAt'), limit(50));
  
  unsubscribe = onSnapshot(q, async (snapshot) => {
    const msgs = document.getElementById('messages');
    
    // Bei erstem Load alle Nachrichten laden
    if (msgs.children.length === 0) {
      msgs.innerHTML = '';
      for (const docSnap of snapshot.docs) {
        await appendMessage(docSnap);
      }
    } else {
      // Nur neue Nachrichten hinzufügen
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          // Prüfe ob Nachricht schon existiert
          if (!document.querySelector(`[data-msg-id="${change.doc.id}"]`)) {
            await appendMessage(change.doc);
          }
        }
      });
    }
    
    msgs.scrollTop = msgs.scrollHeight;
  });
}

// Helper function to append a single message
async function appendMessage(docSnap) {
  const data = docSnap.data();
  const div = document.createElement('div');
  div.className = 'message';
  div.setAttribute('data-msg-id', docSnap.id);
  
  // Username anzeigen (aus Nachricht oder aus Cache laden)
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
  
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User ist eingeloggt - prüfe ob Username existiert
    const userData = await loadUserData(user.uid);
    
    if (userData && userData.username) {
      // Username existiert - direkt zum Chat
      currentUserData = userData;
      showScreen('chatScreen');
      loadMessages();
      document.getElementById('userInfo').textContent = `@${userData.username}`;
    } else {
      // Kein Username - Username-Setup anzeigen
      showScreen('usernameScreen');
    }
  } else {
    // User ist ausgeloggt
    if (unsubscribe) unsubscribe();
    currentUserData = null;
    showScreen('loginScreen');
  }
});
