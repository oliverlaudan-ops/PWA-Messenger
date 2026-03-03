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
  limit,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ── Reactions for DMs ────────────────────────────────────────────────────

const DM_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export async function toggleDMReaction(messageId, chatId, emoji) {
  if (!auth.currentUser) return;
  
  try {
    const msgRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    
    if (!msgSnap.exists()) return;
    
    const data = msgSnap.data();
    const reactions = data.reactions || {};
    const userReactions = reactions[emoji] || [];
    
    if (userReactions.includes(auth.currentUser.uid)) {
      const updated = userReactions.filter(uid => uid !== auth.currentUser.uid);
      if (updated.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = updated;
      }
    } else {
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(auth.currentUser.uid);
    }
    
    await updateDoc(msgRef, { reactions });
  } catch (e) {
    console.error('Error toggling DM reaction:', e);
  }
}

export function showDMReactionPicker(messageId, chatId, button) {
  const existing = document.querySelector('.reaction-picker');
  if (existing) existing.remove();
  
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  
  DM_REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'reaction-emoji';
    btn.textContent = emoji;
    btn.onclick = () => {
      toggleDMReaction(messageId, chatId, emoji);
      picker.remove();
    };
    picker.appendChild(btn);
  });
  
  const rect = button.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.top - 40}px`;
  picker.style.zIndex = '1000';
  
  document.body.appendChild(picker);
  
  setTimeout(() => {
    document.addEventListener('click', function closePicker(e) {
      if (!picker.contains(e.target) && e.target !== button) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    });
  }, 100);
}

// ── Read Receipts for DMs ─────────────────────────────────────────────────

async function markDMAsRead(messageId, chatId) {
  if (!auth.currentUser) return;
  
  try {
    const msgRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    
    if (!msgSnap.exists()) return;
    
    const data = msgSnap.data();
    const readBy = data.readBy || [];
    
    if (!readBy.includes(auth.currentUser.uid)) {
      await updateDoc(msgRef, {
        readBy: arrayUnion(auth.currentUser.uid)
      });
    }
  } catch (e) {
    console.error('Error marking DM as read:', e);
  }
}

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
              // Mark all messages as read
              const msgsQuery = await getDocs(query(
                collection(db, 'directMessages', chatId, 'messages'),
                where('uid', '!=', auth.currentUser.uid)
              ));
              for (const msgDoc of msgsQuery.docs) {
                await markDMAsRead(msgDoc.id, chatId);
              }
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
  if (data.uid === auth.currentUser?.uid) {
    div.classList.add('my-message');
  }
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

  // Read receipt for DMs - only show for own messages
  const readBy = data.readBy || [];
  const isMyMessage = data.uid === auth.currentUser?.uid;
  const otherReaders = readBy.filter(uid => uid !== auth.currentUser?.uid);
  
  if (isMyMessage && otherReaders.length >= 1) {
    const readSpan = document.createElement('span');
    readSpan.className = 'read-receipt';
    readSpan.textContent = otherReaders.length >= 2 ? '✓✓' : '✓';
    readSpan.title = otherReaders.length >= 2 ? `Gelesen von ${otherReaders.length}` : 'Gelesen';
    div.appendChild(readSpan);
  }


  // Reaction button and display
  const reactions = data.reactions || {};
  const reactionDiv = document.createElement('div');
  reactionDiv.className = 'message-reactions';
  
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
    const chatId = createChatId(auth.currentUser.uid, currentDMUser.uid);
    showDMReactionPicker(docSnap.id, chatId, reactBtn);
  };
  
  reactionDiv.appendChild(reactBtn);
  div.appendChild(reactionDiv);
  document.getElementById('dmMessages').appendChild(div);
}

async function updateDMMessage(docSnap) {
  const existingMsg = document.querySelector(`[data-dm-msg-id="${docSnap.id}"]`);
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
  
  if (isMyMessage && otherReaders.length >= 1) {
    if (!readReceipt) {
      readReceipt = document.createElement('span');
      readReceipt.className = 'read-receipt';
      existingMsg.appendChild(readReceipt);
    }
    readReceipt.textContent = otherReaders.length >= 2 ? '✓✓' : '✓';
    readReceipt.title = otherReaders.length >= 2 ? `Gelesen von ${otherReaders.length}` : 'Gelesen';
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
    const chatId = createChatId(auth.currentUser.uid, currentDMUser.uid);
    showDMReactionPicker(docSnap.id, chatId, reactBtn);
  };
  reactionDiv.appendChild(reactBtn);
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
      createdAt: serverTimestamp(),
      readBy: [auth.currentUser.uid]
    });

    await updateChatMetadata(chatId, text, [auth.currentUser.uid, currentDMUser.uid], auth.currentUser.uid);

    document.getElementById('dmMessageInput').value = '';
  } catch (e) {
    console.error('Error sending DM:', e);
    alert('Fehler beim Senden der Nachricht.');
  }
}
