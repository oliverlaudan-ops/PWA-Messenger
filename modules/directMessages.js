// modules/directMessages.js
// Direct messaging functionality

import {
  db, auth,
  currentUserData, currentDMUser,
  setCurrentDMUser, setDmUnsubscribe, setHasResetUnread,
  dmUnsubscribe, hasResetUnreadForCurrentChat,
  setCurrentDMChatId
} from './state.js';
import { formatTimestamp } from './ui.js';
import { loadUserData, closeUserSearch } from './users.js';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

// ── Chat list ─────────────────────────────────────────────────────────────────

export async function loadDMChatList() {
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

// ── Metadata helpers ──────────────────────────────────────────────────────────

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

// ── Open / close DM chat ──────────────────────────────────────────────────────

function startDirectMessageById(userId, username) {
  startDirectMessage({ uid: userId, username });
}

export async function startDirectMessage(user) {
  closeUserSearch();
  setCurrentDMUser(user);
  setHasResetUnread(false);

  const chatId = createChatId(auth.currentUser.uid, user.uid);

  setCurrentDMChatId(chatId);          // ← state.js (was window.currentDMChatId)

  document.getElementById('dmListView').classList.add('hidden');
  document.getElementById('dmChatView').classList.remove('hidden');
  document.getElementById('dmChatUsername').textContent = `👤 @${user.username}`;

  // Initialize mute button
  if (window.initMuteButton) {
    window.initMuteButton(chatId);
  }

  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await updateChatMetadata(chatId, '', [auth.currentUser.uid, user.uid], null);
  }

  await resetUnreadCount(chatId, auth.currentUser.uid);
  setHasResetUnread(true);

  loadDMMessages(user.uid);
}

export function closeDMChat() {
  if (dmUnsubscribe) {
    dmUnsubscribe();
    setDmUnsubscribe(null);
  }

  setCurrentDMChatId(null);            // ← state.js (was window.currentDMChatId = null)

  setCurrentDMUser(null);
  setHasResetUnread(false);
  document.getElementById('dmChatView').classList.add('hidden');
  document.getElementById('dmListView').classList.remove('hidden');
  document.getElementById('dmMessages').innerHTML = '';
  document.getElementById('dmMessageInput').value = '';

  loadDMChatList();
}

// ── Messages ──────────────────────────────────────────────────────────────────

function loadDMMessages(otherUserId) {
  const chatId = createChatId(auth.currentUser.uid, otherUserId);

  const q = query(
    collection(db, 'directMessages', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  const unsubscribeFn = onSnapshot(q, async (snapshot) => {
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
              setHasResetUnread(true);
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

  setDmUnsubscribe(unsubscribeFn);
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

  document.getElementById('dmMessages').appendChild(div);
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

export async function sendDMMessage() {
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
}
