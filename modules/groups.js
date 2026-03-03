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
  onSnapshot, limit, arrayUnion, arrayRemove, increment
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ── Reactions ────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export async function toggleReaction(messageId, groupId, emoji) {
  if (!auth.currentUser) return;
  
  try {
    const msgRef = doc(db, 'groupMessages', groupId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    
    if (!msgSnap.exists()) return;
    
    const data = msgSnap.data();
    const reactions = data.reactions || {};
    const userReactions = reactions[emoji] || [];
    
    if (userReactions.includes(auth.currentUser.uid)) {
      // Remove reaction
      const updated = userReactions.filter(uid => uid !== auth.currentUser.uid);
      if (updated.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = updated;
      }
    } else {
      // Add reaction
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(auth.currentUser.uid);
    }
    
    await updateDoc(msgRef, { reactions });
  } catch (e) {
    console.error('Error toggling reaction:', e);
  }
}

export function showReactionPicker(messageId, groupId, button) {
  // Remove any existing picker
  const existing = document.querySelector('.reaction-picker');
  if (existing) existing.remove();
  
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  
  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'reaction-emoji';
    btn.textContent = emoji;
    btn.onclick = () => {
      toggleReaction(messageId, groupId, emoji);
      picker.remove();
    };
    picker.appendChild(btn);
  });
  
  // Position picker near the button
  const rect = button.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.top - 40}px`;
  picker.style.zIndex = '1000';
  
  document.body.appendChild(picker);
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closePicker(e) {
      if (!picker.contains(e.target) && e.target !== button) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    });
  }, 100);
}

// ── Read Receipts ─────────────────────────────────────────────────────────

export async function markGroupMessageAsRead(messageId, groupId) {
  if (!auth.currentUser) return;
  
  try {
    const msgRef = doc(db, 'groupMessages', groupId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    
    if (!msgSnap.exists()) return;
    
    const data = msgSnap.data();
    const readBy = data.readBy || [];
    
    // Add user to readBy if not already there
    if (!readBy.includes(auth.currentUser.uid)) {
      await updateDoc(msgRef, {
        readBy: arrayUnion(auth.currentUser.uid)
      });
    }
  } catch (e) {
    console.error('Error marking message as read:', e);
  }
}

export async function markAllGroupMessagesAsRead(groupId) {
  if (!auth.currentUser) return;
  
  try {
    // Get all messages - simpler approach
    const msgsSnapshot = await getDocs(collection(db, 'groupMessages', groupId, 'messages'));
    
    const batch = [];
    for (const msgDoc of msgsSnapshot.docs) {
      const data = msgDoc.data();
      // Add current user to readBy if not already there (and not own message)
      const readBy = data.readBy || [];
      if (data.uid !== auth.currentUser.uid && !readBy.includes(auth.currentUser.uid)) {
        batch.push(updateDoc(doc(db, 'groupMessages', groupId, 'messages', msgDoc.id), {
          readBy: arrayUnion(auth.currentUser.uid)
        }));
      }
    }
    
    await Promise.all(batch);
  } catch (e) {
    console.error('Error marking all messages as read:', e);
  }
}

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
              await markAllGroupMessagesAsRead(groupId);
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
  if (data.uid === auth.currentUser?.uid) {
    div.classList.add('my-message');
  }
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

  // Read receipt indicator - only show for own messages
  const readBy = data.readBy || [];
  const isMyMessage = data.uid === auth.currentUser?.uid;
  const otherReaders = readBy.filter(uid => uid !== auth.currentUser?.uid);
  
  if (isMyMessage && otherReaders.length >= 2) {
    const readSpan = document.createElement('span');
    readSpan.className = 'read-receipt';
    readSpan.title = `Gelesen von ${otherReaders.length} Personen`;
    readSpan.textContent = '✓✓';
    div.appendChild(readSpan);
  } else if (isMyMessage && otherReaders.length === 1) {
    const readSpan = document.createElement('span');
    readSpan.className = 'read-receipt';
    readSpan.title = 'Gelesen';
    readSpan.textContent = '✓';
    div.appendChild(readSpan);
  }

  // Reaction button and display
  const reactions = data.reactions || {};
  const reactionDiv = document.createElement('div');
  reactionDiv.className = 'message-reactions';
  
  // Show existing reactions
  Object.keys(reactions).forEach(emoji => {
    const users = reactions[emoji];
    if (users && users.length > 0) {
      const reactionBadge = document.createElement('span');
      reactionBadge.className = 'reaction-badge';
      reactionBadge.textContent = `${emoji} ${users.length}`;
      reactionDiv.appendChild(reactionBadge);
    }
  });
  
  // Add reaction button
  const reactBtn = document.createElement('button');
  reactBtn.className = 'react-btn';
  reactBtn.textContent = '😊';
  reactBtn.onclick = (e) => {
    e.stopPropagation();
    showReactionPicker(docSnap.id, currentGroup.groupId, reactBtn);
  };
  
  reactionDiv.appendChild(reactBtn);
  div.appendChild(reactionDiv);

  document.getElementById('groupMessages').appendChild(div);
}

async function updateGroupMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-group-msg-id="${docSnap.id}"]`);
  if (!existingMsg) return;

  const data = docSnap.data();
  let timeSpan = existingMsg.querySelector('.time');
  let readReceipt = existingMsg.querySelector('.read-receipt');

  if (data.createdAt && !timeSpan) {
    timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTimestamp(data.createdAt);
    existingMsg.appendChild(timeSpan);
  } else if (data.createdAt && timeSpan) {
    timeSpan.textContent = formatTimestamp(data.createdAt);
  }

  // Update read receipt - only for own messages
  const readBy = data.readBy || [];
  const isMyMessage = data.uid === auth.currentUser?.uid;
  const otherReaders = readBy.filter(uid => uid !== auth.currentUser?.uid);
  
  if (isMyMessage && otherReaders.length >= 2) {
    if (!readReceipt) {
      readReceipt = document.createElement('span');
      readReceipt.className = 'read-receipt';
      existingMsg.appendChild(readReceipt);
    }
    readReceipt.textContent = '✓✓';
    readReceipt.title = `Gelesen von ${otherReaders.length} Personen`;
  } else if (isMyMessage && otherReaders.length === 1) {
    if (!readReceipt) {
      readReceipt = document.createElement('span');
      readReceipt.className = 'read-receipt';
      existingMsg.appendChild(readReceipt);
    }
    readReceipt.textContent = '✓';
    readReceipt.title = 'Gelesen';
  }

  // Update reactions
  const reactions = data.reactions || {};
  let reactionDiv = existingMsg.querySelector('.message-reactions');
  
  if (!reactionDiv) {
    reactionDiv = document.createElement('div');
    reactionDiv.className = 'message-reactions';
    existingMsg.appendChild(reactionDiv);
  } else {
    reactionDiv.innerHTML = '';
  }
  
  Object.keys(reactions).forEach(emoji => {
    const users = reactions[emoji];
    if (users && users.length > 0) {
      const reactionBadge = document.createElement('span');
      reactionBadge.className = 'reaction-badge';
      reactionBadge.textContent = `${emoji} ${users.length}`;
      reactionDiv.appendChild(reactionBadge);
    }
  });
  
  const reactBtn = document.createElement('button');
  reactBtn.className = 'react-btn';
  reactBtn.textContent = '😊';
  reactBtn.onclick = (e) => {
    e.stopPropagation();
    showReactionPicker(docSnap.id, currentGroup.groupId, reactBtn);
  };
  reactionDiv.appendChild(reactBtn);
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
      createdAt: serverTimestamp(),
      readBy: [auth.currentUser.uid] // Initialize readBy with sender
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
