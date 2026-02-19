// modules/groups.js
// Group Chat Module

import {
  db, auth,
  currentUserData, currentGroup,
  setCurrentGroup, setGroupUnsubscribe, setHasResetUnread,
  groupUnsubscribe, hasResetUnreadForCurrentChat,
  setCurrentGroupId
} from './state.js';
import { formatTimestamp, showError } from './ui.js';
import { loadUserData } from './users.js';
import {
  collection, addDoc, query, where, orderBy,
  getDocs, getDoc, doc, updateDoc, serverTimestamp,
  onSnapshot, limit
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ── Modal helpers ────────────────────────────────────────────────────────────

export function showCreateGroup() {
  document.getElementById('groupNameInput').value = '';
  document.getElementById('createGroupError').classList.add('hidden');
  document.getElementById('createGroupModal').classList.remove('hidden');
  document.getElementById('groupNameInput').focus();
}

export function closeCreateGroup() {
  document.getElementById('createGroupModal').classList.add('hidden');
}

// ── Create group ─────────────────────────────────────────────────────────────

export async function createGroup() {
  const name = document.getElementById('groupNameInput').value.trim();
  const errorEl = document.getElementById('createGroupError');

  if (!name || name.length < 3 || name.length > 50) {
    errorEl.textContent = 'Gruppenname muss 3–50 Zeichen lang sein.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    await addDoc(collection(db, 'groups'), {
      name,
      createdBy: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: {}
    });

    closeCreateGroup();
    loadGroupList();
  } catch (e) {
    console.error('Error creating group:', e);
    errorEl.textContent = 'Fehler beim Erstellen der Gruppe.';
    errorEl.classList.remove('hidden');
  }
}

// ── Group list ───────────────────────────────────────────────────────────────

export async function loadGroupList() {
  if (!auth.currentUser) return;

  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', auth.currentUser.uid),
    orderBy('lastMessageTime', 'desc')
  );

  try {
    const snapshot = await getDocs(q);
    const list = document.getElementById('groupList');
    list.innerHTML = '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const unread = (data.unreadCount || {})[auth.currentUser.uid] || 0;

      const item = document.createElement('div');
      item.className = 'chat-item';
      item.innerHTML = `
        <span class="chat-name">👥 ${data.name}</span>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        <span class="last-message">${data.lastMessage || ''}</span>
      `;
      item.addEventListener('click', () => openGroupChat(docSnap.id, data.name));
      list.appendChild(item);
    });
  } catch (e) {
    console.error('Error loading group list:', e);
  }
}

// ── Open / close group chat ──────────────────────────────────────────────────

export async function openGroupChat(groupId, groupName) {
  setCurrentGroup({ groupId, groupName });
  setCurrentGroupId(groupId);          // ← state.js (was window.currentGroupId)
  setHasResetUnread(false);

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

  loadGroupMessages(groupId);
}

export function closeGroupChat() {
  if (groupUnsubscribe) {
    groupUnsubscribe();
    setGroupUnsubscribe(null);
  }

  setCurrentGroupId(null);             // ← state.js (was window.currentGroupId = null)
  setCurrentGroup(null);
  setHasResetUnread(false);

  document.getElementById('groupChatView').classList.add('hidden');
  document.getElementById('groupListView').classList.remove('hidden');
  document.getElementById('groupMessages').innerHTML = '';
  document.getElementById('groupMessageInput').value = '';

  loadGroupList();
}

// ── Messages ─────────────────────────────────────────────────────────────────

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
      for (const change of snapshot.docChanges()) {
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
      }
    }

    msgs.scrollTop = msgs.scrollHeight;
  }, (error) => {
    console.error('Error in group messages listener:', error);
  });

  setGroupUnsubscribe(unsubscribeFn);
}

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

  document.getElementById('groupMessages').appendChild(div);
}

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

// ── Metadata helpers ─────────────────────────────────────────────────────────

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
