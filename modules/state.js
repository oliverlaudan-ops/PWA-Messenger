// modules/state.js
// Shared state and Firebase initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlaUIHlW8WXYtOw41_41HQvIey3zVblgI",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:171949632144cfa4d8fb31",
  measurementId: "G-2H9R8P1KS8"
};

// Initialize Firebase (single source of truth — firebase.js re-exports from here)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Shared state
export let unsubscribe = null;
export let dmUnsubscribe = null;
export let groupUnsubscribe = null;
export let currentUserData = null;
export const userCache = {};
export let currentTab = 'groups';
export let allUsers = [];
export let currentDMUser = null;
export let currentGroup = null;
export let hasResetUnreadForCurrentChat = false;

// Active chat IDs (replaces window.currentGroupId / window.currentDMChatId)
export let currentGroupId = null;
export let currentDMChatId = null;

// State setters (to avoid direct mutation from other modules)
export function setUnsubscribe(fn) { unsubscribe = fn; }
export function setDmUnsubscribe(fn) { dmUnsubscribe = fn; }
export function setGroupUnsubscribe(fn) { groupUnsubscribe = fn; }
export function setCurrentUserData(data) { currentUserData = data; }
export function setCurrentTab(tab) { currentTab = tab; }
export function setAllUsers(users) { allUsers = users; }
export function setCurrentDMUser(user) { currentDMUser = user; }
export function setCurrentGroup(group) { currentGroup = group; }
export function setHasResetUnread(value) { hasResetUnreadForCurrentChat = value; }
export function setCurrentGroupId(id) { currentGroupId = id; }
export function setCurrentDMChatId(id) { currentDMChatId = id; }

// Clear all state
export function clearState() {
  if (unsubscribe) unsubscribe();
  if (dmUnsubscribe) dmUnsubscribe();
  if (groupUnsubscribe) groupUnsubscribe();
  unsubscribe = null;
  dmUnsubscribe = null;
  groupUnsubscribe = null;
  currentUserData = null;
  currentTab = 'groups';
  allUsers = [];
  currentDMUser = null;
  currentGroup = null;
  hasResetUnreadForCurrentChat = false;
  currentGroupId = null;
  currentDMChatId = null;
  Object.keys(userCache).forEach(key => delete userCache[key]);
}

console.log('✅ State module loaded');
