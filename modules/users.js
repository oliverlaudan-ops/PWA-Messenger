// modules/users.js
// User management and search

import { db, auth, userCache, allUsers, setAllUsers } from './state.js';
import { collection, query, orderBy, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Load user data with caching
export async function loadUserData(uid) {
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

// Load all users (except current user)
export async function loadAllUsers() {
  try {
    const usersQuery = query(collection(db, 'users'), orderBy('username'));
    const snapshot = await getDocs(usersQuery);
    
    const users = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (docSnap.id !== auth.currentUser.uid) {
        users.push({
          uid: docSnap.id,
          username: data.username,
          email: data.email
        });
      }
    });
    
    setAllUsers(users);
    return users;
  } catch (e) {
    console.error('Error loading users:', e);
    return [];
  }
}

// Render user list in UI
export function renderUserList(users) {
  const userList = document.getElementById('userList');
  
  if (users.length === 0) {
    userList.innerHTML = '<div class="no-users">Keine Benutzer gefunden</div>';
    return;
  }
  
  userList.innerHTML = '';
  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.onclick = () => {
      window.dispatchEvent(new CustomEvent('startDirectMessage', { detail: user }));
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

// Show user search modal
export async function showUserSearch() {
  const modal = document.getElementById('userSearchModal');
  modal.classList.remove('hidden');
  
  const userList = document.getElementById('userList');
  userList.innerHTML = '<div class="spinner"></div>';
  
  await loadAllUsers();
  renderUserList(allUsers);
  
  document.getElementById('userSearchInput').value = '';
  document.getElementById('userSearchInput').focus();
}

// Close user search modal
export function closeUserSearch() {
  document.getElementById('userSearchModal').classList.add('hidden');
}

// Filter users based on search input
export function filterUsers() {
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
}

console.log('✅ Users module loaded');
