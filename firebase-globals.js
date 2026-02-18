// This file exports global references needed by other modules
// Import this AFTER firebase.js to ensure proper initialization

import { db, auth } from './firebase.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Global reference to current group (updated by openGroupChat in firebase.js)
window.currentGroup = null;

// Cache for user data
const userCache = {};

// Load user data function (accessible globally)
window.loadUserData = async function(uid) {
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
};

// Listen for currentGroup updates from firebase.js
// firebase.js should call window.updateCurrentGroup(group) when opening a chat
window.updateCurrentGroup = function(group) {
  window.currentGroup = group;
};

console.log('✅ Firebase globals initialized');
