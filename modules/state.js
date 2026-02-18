// modules/state.js
// Shared state and Firebase initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDd04hw7kkLI0-vJWjXhpVwRlp-WBMYuV8",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:427a7829345cde6ed8fb31",
  measurementId: "G-0w21RL0G06"
};

// Initialize Firebase
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
  Object.keys(userCache).forEach(key => delete userCache[key]);
}

console.log('✅ State module loaded');
