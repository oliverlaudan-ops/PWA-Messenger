/**
 * Firebase Cloud Functions for PWA Messenger
 * Updated to use FCM v1 API
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Send push notification when a new group message is created
 */
exports.onNewGroupMessage = functions.firestore
  .document('groupMessages/{groupId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const { groupId, messageId } = context.params;
      const messageData = snap.data();
      const { text, uid: senderId, username } = messageData;

      console.log(`📬 New group message in ${groupId} from ${username}`);

      // Get group data
      const groupDoc = await db.collection('groups').doc(groupId).get();
      if (!groupDoc.exists) {
        console.log('❌ Group not found');
        return null;
      }

      const groupData = groupDoc.data();
      const { name: groupName, members } = groupData;

      // Send notification to all members except sender
      const recipientIds = members.filter(memberId => memberId !== senderId);

      if (recipientIds.length === 0) {
        console.log('ℹ️ No recipients for notification');
        return null;
      }

      // Get FCM tokens for all recipients
      const tokens = [];
      for (const recipientId of recipientIds) {
        const userDoc = await db.collection('users').doc(recipientId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // Check if user has notifications enabled
          if (userData.notificationsEnabled === false) {
            console.log(`🔕 Notifications disabled for user ${recipientId}`);
            continue;
          }

          // Check user's notification settings
          const settings = userData.notificationSettings || {};
          
          // Skip if notifications disabled
          if (settings.enabled === false) {
            continue;
          }

          // Skip if chat is muted
          if (settings.chatMuted && settings.chatMuted[groupId]) {
            const muteUntil = settings.chatMuted[groupId];
            if (Date.now() < muteUntil) {
              console.log(`🔇 Group ${groupId} muted for user ${recipientId}`);
              continue;
            }
          }

          // Skip if Do Not Disturb is active
          if (settings.doNotDisturb) {
            if (!settings.doNotDisturbUntil || Date.now() < settings.doNotDisturbUntil) {
              console.log(`🌙 DND active for user ${recipientId}`);
              continue;
            }
          }

          // Get FCM tokens
          if (userData.fcmTokens) {
            Object.keys(userData.fcmTokens).forEach(token => {
              tokens.push({
                token,
                userId: recipientId,
                unreadCount: (groupData.unreadCount && groupData.unreadCount[recipientId]) || 0
              });
            });
          }
        }
      }

      if (tokens.length === 0) {
        console.log('⚠️ No valid FCM tokens found');
        return null;
      }

      console.log(`📤 Sending notifications to ${tokens.length} devices`);

      // Prepare notification payload
      const notificationTitle = `👥 ${groupName}`;
      const notificationBody = `${username}: ${text.length > 100 ? text.substring(0, 100) + '...' : text}`;

      // Send notifications using FCM v1 API
      const messages = tokens.map(({ token, userId, unreadCount }) => ({
        token,
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          chatId: groupId,
          chatType: 'group',
          chatName: groupName,
          senderId,
          senderName: username,
          messageId,
          unreadCount: String(unreadCount)
        },
        webpush: {
          fcmOptions: {
            link: `https://messenger.future-pulse.tech/?openChat=${groupId}&type=group`
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            vibrate: [200, 100, 200],
            requireInteraction: false
          }
        }
      }));

      // Send all messages
      const results = await admin.messaging().sendEach(messages);
      
      console.log(`✅ Successfully sent ${results.successCount} notifications`);
      
      if (results.failureCount > 0) {
        console.log(`❌ Failed to send ${results.failureCount} notifications`);
        
        // Clean up invalid tokens
        results.responses.forEach((result, index) => {
          if (!result.success) {
            const { token, userId } = tokens[index];
            const errorCode = result.error?.code;
            
            console.log(`⚠️ Error for user ${userId}: ${errorCode}`);
            
            // Remove invalid tokens
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              console.log(`🗑️ Removing invalid token for user ${userId}`);
              db.collection('users').doc(userId).update({
                [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
              }).catch(err => console.error('Error removing token:', err));
            }
          }
        });
      }

      return null;
    } catch (error) {
      console.error('❌ Error sending group message notification:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return null;
    }
  });

/**
 * Send push notification when a new direct message is created
 */
exports.onNewDirectMessage = functions.firestore
  .document('directMessages/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const { chatId, messageId } = context.params;
      const messageData = snap.data();
      const { text, uid: senderId, username } = messageData;

      console.log(`📬 New DM in ${chatId} from ${username}`);

      // Extract recipient ID from chatId (format: userId1_userId2)
      const [user1, user2] = chatId.split('_');
      const recipientId = user1 === senderId ? user2 : user1;

      // Get recipient's user data
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      if (!recipientDoc.exists) {
        console.log('❌ Recipient not found');
        return null;
      }

      const recipientData = recipientDoc.data();

      // Check if sender is blocked by recipient
      const blockedByMe = recipientData.blockedUsers || {};
      if (blockedByMe[senderId]) {
        console.log('🚫 Sender is blocked by recipient');
        return null; // Don't send notification, message stays but no notification
      }

      // Check if recipient has "friends only" DM mode
      if (recipientData.dmSettings === 'friends_only') {
        // Check if sender and recipient already have a chat
        const existingChat = await db.collection('chats').doc(chatId).get();
        if (!existingChat.exists) {
          console.log('📬 DM request - friends only mode');
          // Create DM request instead of delivering
          await db.collection('dmRequests').add({
            from: senderId,
            fromUsername: username,
            to: recipientId,
            status: 'pending',
            message: text,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return null;
        }
      }

      // Check if notifications are enabled
      if (recipientData.notificationsEnabled === false) {
        console.log('🔕 Notifications disabled for recipient');
        return null;
      }

      // Check notification settings
      const settings = recipientData.notificationSettings || {};
      
      if (settings.enabled === false) {
        return null;
      }

      // Check if chat is muted
      if (settings.chatMuted && settings.chatMuted[chatId]) {
        const muteUntil = settings.chatMuted[chatId];
        if (Date.now() < muteUntil) {
          console.log('🔇 Chat is muted');
          return null;
        }
      }

      // Check Do Not Disturb
      if (settings.doNotDisturb) {
        if (!settings.doNotDisturbUntil || Date.now() < settings.doNotDisturbUntil) {
          console.log('🌙 Do Not Disturb is active');
          return null;
        }
      }

      // Get FCM tokens
      if (!recipientData.fcmTokens) {
        console.log('⚠️ No FCM tokens for recipient');
        return null;
      }

      const tokens = Object.keys(recipientData.fcmTokens);

      // Get unread count
      const chatDoc = await db.collection('chats').doc(chatId).get();
      const unreadCount = chatDoc.exists 
        ? (chatDoc.data().unreadCount && chatDoc.data().unreadCount[recipientId]) || 0 
        : 0;

      // Prepare notification
      const notificationTitle = `👤 @${username}`;
      const notificationBody = text.length > 100 ? text.substring(0, 100) + '...' : text;

      const messages = tokens.map(token => ({
        token,
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          chatId,
          chatType: 'dm',
          userId: senderId,
          username,
          messageId,
          unreadCount: String(unreadCount)
        },
        webpush: {
          fcmOptions: {
            link: `https://messenger.future-pulse.tech/?openChat=${chatId}&type=dm`
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            vibrate: [200, 100, 200],
            requireInteraction: false
          }
        }
      }));

      const results = await admin.messaging().sendEach(messages);
      
      console.log(`✅ Successfully sent ${results.successCount} notifications`);
      
      if (results.failureCount > 0) {
        console.log(`❌ Failed to send ${results.failureCount} notifications`);
        
        // Clean up invalid tokens
        results.responses.forEach((result, index) => {
          if (!result.success) {
            const token = tokens[index];
            const errorCode = result.error?.code;
            
            console.log(`⚠️ Error: ${errorCode}`);
            
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              console.log(`🗑️ Removing invalid token`);
              db.collection('users').doc(recipientId).update({
                [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
              }).catch(err => console.error('Error removing token:', err));
            }
          }
        });
      }

      return null;
    } catch (error) {
      console.error('❌ Error sending DM notification:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return null;
    }
  });

/**
 * Clean up old FCM tokens (run daily)
 */
exports.cleanupOldTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('🧹 Cleaning up old FCM tokens...');
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const usersSnapshot = await db.collection('users').get();
    
    let tokensRemoved = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.fcmTokens) {
        const updates = {};
        let hasOldTokens = false;
        
        Object.entries(userData.fcmTokens).forEach(([token, tokenData]) => {
          if (tokenData.lastUsed && tokenData.lastUsed.toMillis() < thirtyDaysAgo) {
            updates[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
            hasOldTokens = true;
            tokensRemoved++;
          }
        });
        
        if (hasOldTokens) {
          await db.collection('users').doc(userDoc.id).update(updates);
        }
      }
    }
    
    console.log(`✅ Removed ${tokensRemoved} old FCM tokens`);
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY BOT
// ─────────────────────────────────────────────────────────────────────────────

// Bot configuration
const BOT_CONFIG = {
  username: 'helper',
  displayName: '🤖 Helper Bot',
  avatar: '🤖',
  userId: 'bot_helper'
};

// Bot state (in-memory for custom triggers - in production use Firestore)
const customTriggers = new Map();
const COMMANDS = {
  help: {
    description: 'Zeigt diese Hilfe an',
    usage: '/help',
    response: `🤖 **Helper Bot**

Hier sind meine Befehle:

**📡 Info:**
/help - Diese Hilfe
/wetter [Stadt] - Wetterinfo
/quote - Zufälliges Zitat
/roll - Würfeln (1-6)
/magic8 - Magic 8 Ball
/uuid - Zufällige ID generieren
/time - Aktuelle Zeit
/uptime - Bot Laufzeit

**🚫 User:**
/block @user - User blockieren
/unblock @user - User entblocken

**📬 DM-Einstellungen:**
/dm everyone - Jeder kann DM schicken
/dm friends - Nur Freunde
/dm list - Offene Anfragen
/dm accept - Alle annehmen
/dm reject - Alle ablehnen

**⚙️ Gruppen (Admin):**
/kick @user - Member entfernen
/ban @user - User verbannen
/trigger add "Text" "Antwort" - Trigger erstellen
/trigger list - Trigger anzeigen
/trigger remove "Text" - Trigger löschen`
  },

  wetter: {
    description: 'Wetter für eine Stadt',
    usage: '/wetter Berlin',
    response: (args) => {
      const city = args.join(' ') || 'Berlin';
      return `🌤️ **Wetter für ${city}**

Ich bin noch kein echtes Wetter-Bot, aber ich kann dir sagen:
- Geh nach draußen und schau nach oben!
- Oder besuche [wttr.in/${city}](https://wttr.in/${city})`;
    }
  },

  quote: {
    description: 'Zufälliges Zitat',
    usage: '/quote',
    response: () => {
      const quotes = [
        '"Die beste Zeit, einen Baum zu pflanzen, war vor 20 Jahren. Die zweitbeste Zeit ist jetzt."',
        '"KI wird die Welt nicht übernehmen – aber Menschen, die KI nutzen, werden die Welt übernehmen."',
        '"Das einzige Geheimnis des Erfolgs ist, den Standpunkt des anderen zu verstehen."',
        '"Innovation unterscheidet Leader von Followern."',
        '"Der beste Weg, die Zukunft vorherzusagen, ist, sie zu erschaffen."',
        '"Jeder Tag ist eine neue Chance, etwas zu verändern."'
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      return `💬 **Zitat des Tages:**\n\n${randomQuote}`;
    }
  },

  roll: {
    description: 'Würfeln',
    usage: '/roll',
    response: () => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const dice = ['⚀', '⚁', '🎲', '🎯', '🎳', '🎰'][roll - 1];
      return `🎲 **Du hast gewürfelt:** ${roll} ${dice}`;
    }
  },

  magic8: {
    description: 'Magic 8 Ball',
    usage: '/magic8 [Frage]',
    response: () => {
      const answers = [
        'Ja, auf jeden Fall! 🔥',
        'Nein, eher nicht... ❄️',
        'Vielleicht später... 🤔',
        'Frag mich später nochmal ⏰',
        'Das sehe ich positiv! ✨',
        'Ich bin mir nicht sicher 🤷',
        'Auf jeden Fall! 🚀',
        'Eher nein 🙈'
      ];
      const answer = answers[Math.floor(Math.random() * answers.length)];
      return `🎱 **Magic 8 Ball sagt:**\n\n${answer}`;
    }
  },

  uuid: {
    description: 'UUID generieren',
    usage: '/uuid',
    response: () => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      return `🆔 **Neue UUID:**\n\n\`${uuid}\``;
    }
  },

  time: {
    description: 'Aktuelle Zeit',
    usage: '/time',
    response: () => {
      const now = new Date();
      return `🕐 **Aktuelle Zeit:**\n\n${now.toLocaleString('de-DE', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })}`;
    }
  },

  uptime: {
    description: 'Bot Laufzeit',
    usage: '/uptime',
    response: () => {
      return `⏱️ **Bot Status:**\n\nIch bin online und bereit zu helfen!\n\nType /help für alle Befehle.`;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // USER COMMANDS (Block & DM)
  // ─────────────────────────────────────────────────────────────────────────────

  block: {
    description: 'User blockieren',
    usage: '/block @username',
    response: async (args, chatId, chatType, senderId) => {
      const username = args[0]?.replace('@', '');
      if (!username) return '❌ Bitte gib einen Usernamen an: /block @username';
      
      // Find user to block
      const usersSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) return `❌ User @${username} nicht gefunden`;
      
      const userToBlock = usersSnapshot.docs[0];
      const userId = userToBlock.id;
      
      if (userId === senderId) return '❌ Du kannst dich nicht selbst blockieren!';
      
      // Add to blocked users
      await db.collection('users').doc(senderId).update({
        [`blockedUsers.${userId}`]: true
      });
      
      return `🚫 @${username} wurde blockiert! Du erhältst keine DMs mehr von diesem User.`;
    }
  },

  unblock: {
    description: 'User entblocken',
    usage: '/unblock @username',
    response: async (args, chatId, chatType, senderId) => {
      const username = args[0]?.replace('@', '');
      if (!username) return '❌ Bitte gib einen Usernamen an: /unblock @username';
      
      // Find user to unblock
      const usersSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) return `❌ User @${username} nicht gefunden`;
      
      const userToUnblock = usersSnapshot.docs[0];
      const userId = userToUnblock.id;
      
      // Remove from blocked users
      await db.collection('users').doc(senderId).update({
        [`blockedUsers.${userId}`]: admin.firestore.FieldValue.delete()
      });
      
      return `✅ @${username} wurde entblockt!`;
    }
  },

  dm: {
    description: 'DM-Einstellungen verwalten',
    usage: '/dm accept|reject|list|everyone|friends',
    response: async (args, chatId, chatType, senderId) => {
      const subCommand = args[0]?.toLowerCase();
      
      if (subCommand === 'everyone' || subCommand === 'offene') {
        await db.collection('users').doc(senderId).update({
          dmSettings: 'everyone'
        });
        return '✅ **DM-Einstellung:** JEDER kann dir DMs schicken!';
      }
      
      if (subCommand === 'friends' || subCommand === 'freunde') {
        await db.collection('users').doc(senderId).update({
          dmSettings: 'friends_only'
        });
        return '🔒 **DM-Einstellung:** Nur Freunde können dir DMs schicken!\n\nWer dir eine DM schickt, muss erst angenommen werden.';
      }
      
      if (subCommand === 'accept' || subCommand === 'annehmen') {
        // List pending requests
        const requestsSnapshot = await db.collection('dmRequests')
          .where('to', '==', senderId)
          .where('status', '==', 'pending')
          .get();
        
        if (requestsSnapshot.empty) return '📬 Keine offenen DM-Anfragen';
        
        // Accept all pending requests
        for (const requestDoc of requestsSnapshot.docs) {
          await requestDoc.ref.update({ status: 'accepted' });
        }
        
        return `✅ ${requestsSnapshot.size} DM-Anfrage(n) angenommen! Die User können dir jetzt DMs schicken.`;
      }
      
      if (subCommand === 'reject' || subCommand === 'ablehnen') {
        // List pending requests
        const requestsSnapshot = await db.collection('dmRequests')
          .where('to', '==', senderId)
          .where('status', '==', 'pending')
          .get();
        
        if (requestsSnapshot.empty) return '📬 Keine offenen DM-Anfragen';
        
        // Reject all pending requests
        for (const requestDoc of requestsSnapshot.docs) {
          await requestDoc.ref.update({ status: 'rejected' });
        }
        
        return `❌ ${requestsSnapshot.size} DM-Anfrage(n) abgelehnt.`;
      }
      
      if (subCommand === 'list' || subCommand === 'liste') {
        const requestsSnapshot = await db.collection('dmRequests')
          .where('to', '==', senderId)
          .where('status', '==', 'pending')
          .get();
        
        if (requestsSnapshot.empty) return '📬 Keine offenen DM-Anfragen';
        
        let list = '📬 **Offene DM-Anfragen:**\n\n';
        for (const requestDoc of requestsSnapshot.docs) {
          const request = requestDoc.data();
          list += `• @${request.fromUsername}\n`;
        }
        list += '\n_Tippe /dm accept um alle anzunehmen_';
        return list;
      }
      
      return `❌ Unbekannter Befehl\n\n/dm everyone - Jeder kann DM schicken\n/dm friends - Nur Freunde (Standard)\n/dm list - Anfragen anzeigen\n/dm accept - Alle annehmen\n/dm reject - Alle ablehnen`;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MODERATION COMMANDS
  // ─────────────────────────────────────────────────────────────────────────────

  kick: {
    description: 'Member aus Gruppe entfernen',
    usage: '/kick @username',
    response: async (args, chatId, chatType, senderId) => {
      if (chatType !== 'group') return '❌ Dieser Befehl funktioniert nur in Gruppen!';
      
      const username = args[0]?.replace('@', '');
      if (!username) return '❌ Bitte gib einen Usernamen an: /kick @username';
      
      // Get group data
      const groupDoc = await db.collection('groups').doc(chatId).get();
      if (!groupDoc.exists) return '❌ Gruppe nicht gefunden';
      
      const groupData = groupDoc.data();
      
      // Check if sender is admin OR owner
      const isAdmin = groupData.admins?.includes(senderId);
      const isOwner = groupData.createdBy === senderId;
      if (!isAdmin && !isOwner) {
        return '❌ Nur Admins oder der Owner können Mitglieder entfernen!';
      }
      
      // Find user to kick
      const usersSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        return `❌ User @${username} nicht gefunden`;
      }
      
      const userToKick = usersSnapshot.docs[0];
      const userId = userToKick.id;
      
      // Remove from group
      const newMembers = groupData.members.filter(m => m !== userId);
      const newAdmins = groupData.admins.filter(a => a !== userId);
      
      await db.collection('groups').doc(chatId).update({
        members: newMembers,
        admins: newAdmins
      });
      
      return `👋 @${username} wurde aus der Gruppe entfernt!`;
    }
  },

  ban: {
    description: 'User aus Gruppe verbannen',
    usage: '/ban @username',
    response: async (args, chatId, chatType, senderId) => {
      if (chatType !== 'group') return '❌ Dieser Befehl funktioniert nur in Gruppen!';
      
      const username = args[0]?.replace('@', '');
      if (!username) return '❌ Bitte gib einen Usernamen an: /ban @username';
      
      // Get group data
      const groupDoc = await db.collection('groups').doc(chatId).get();
      if (!groupDoc.exists) return '❌ Gruppe nicht gefunden';
      
      const groupData = groupDoc.data();
      
      // Check if sender is admin OR owner
      const isAdmin = groupData.admins?.includes(senderId);
      const isOwner = groupData.createdBy === senderId;
      if (!isAdmin && !isOwner) {
        return '❌ Nur Admins oder der Owner können Mitglieder bannen!';
      }
      
      // Find user to ban
      const usersSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        return `❌ User @${username} nicht gefunden`;
      }
      
      const userToBan = usersSnapshot.docs[0];
      const userId = userToBan.id;
      
      // Add to banned list and remove from group
      const banned = groupData.banned || [];
      const newMembers = groupData.members.filter(m => m !== userId);
      const newAdmins = groupData.admins.filter(a => a !== userId);
      
      await db.collection('groups').doc(chatId).update({
        members: newMembers,
        admins: newAdmins,
        banned: [...banned, userId]
      });
      
      return `🚫 @${username} wurde aus der Gruppe verbannt!`;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIGGER COMMANDS
  // ─────────────────────────────────────────────────────────────────────────────

  trigger: {
    description: 'Custom Trigger verwalten',
    usage: '/trigger add "Text" "Antwort"',
    response: async (args, chatId, chatType, senderId) => {
      if (chatType !== 'group') return '❌ Trigger funktionieren nur in Gruppen!';
      
      // Get group data
      const groupDoc = await db.collection('groups').doc(chatId).get();
      if (!groupDoc.exists) return '❌ Gruppe nicht gefunden';
      
      const groupData = groupDoc.data();
      
      // Check if sender is admin OR owner
      const isAdmin = groupData.admins?.includes(senderId);
      const isOwner = groupData.createdBy === senderId;
      if (!isAdmin && !isOwner) {
        return '❌ Nur Admins oder der Owner können Trigger verwalten!';
      }
      
      const subCommand = args[0];
      const triggers = groupData.triggers || {};
      
      if (subCommand === 'add' || subCommand === 'set') {
        // Parse: /trigger add "trigger" "response"
        const match = args.slice(1).join(' ').match(/"([^"]+)"\s+"([^"]+)"/);
        if (!match) {
          return `❌ Falsches Format!\n\n/trigger add "Hallo" "Hallo auch!"`;
        }
        
        const [_, triggerText, responseText] = match;
        triggers[triggerText.toLowerCase()] = responseText;
        
        await db.collection('groups').doc(chatId).update({ triggers });
        
        return `✅ Trigger erstellt!\n\n📝 Trigger: "${triggerText}"\n💬 Antwort: "${responseText}"`;
      }
      
      if (subCommand === 'remove' || subCommand === 'delete' || subCommand === 'del') {
        const triggerText = args.slice(1).join(' ').toLowerCase();
        if (!triggerText) return '❌ Bitte gib einen Trigger an: /trigger remove "Text"';
        
        if (triggers[triggerText]) {
          delete triggers[triggerText];
          await db.collection('groups').doc(chatId).update({ triggers });
          return `🗑️ Trigger "${triggerText}" gelöscht!`;
        }
        return `❌ Trigger "${triggerText}" existiert nicht`;
      }
      
      if (subCommand === 'list' || subCommand === 'show') {
        const triggerList = Object.entries(triggers);
        if (triggerList.length === 0) return '📝 Keine Trigger definiert';
        
        let list = '📝 **Trigger Liste:**\n\n';
        for (const [trigger, response] of triggerList) {
          list += `• "${trigger}" → "${response}"\n`;
        }
        return list;
      }
      
      return `❌ Unbekannter Trigger-Befehl\n\n/trigger add "Text" "Antwort"\n/trigger remove "Text"\n/trigger list`;
    }
  }
};

// Start time for uptime
const BOT_START_TIME = Date.now();

/**
 * Process bot commands
 */
async function processBotCommand(command, args, chatId, chatType, senderId) {
  const cmd = command.toLowerCase();
  
  // Check if command exists
  if (!COMMANDS[cmd]) {
    return `❓ Unbekannter Befehl: /${cmd}\n\nTippe /help für alle Befehle.`;
  }
  
  // Execute command
  const handler = COMMANDS[cmd].response;
  if (typeof handler === 'function') {
    return await handler(args, chatId, chatType, senderId);
  }
  return handler;
}

/**
 * Check for custom triggers in messages
 */
async function checkTriggers(text, chatId, chatType) {
  if (chatType !== 'group') return null;
  
  try {
    const groupDoc = await db.collection('groups').doc(chatId).get();
    if (!groupDoc.exists) return null;
    
    const groupData = groupDoc.data();
    const triggers = groupData.triggers || {};
    
    const lowerText = text.toLowerCase();
    
    for (const [trigger, response] of Object.entries(triggers)) {
      if (lowerText.includes(trigger.toLowerCase())) {
        return response;
      }
    }
  } catch (e) {
    console.error('Error checking triggers:', e);
  }
  
  return null;
}

/**
 * Send bot message to chat
 */
async function sendBotMessage(chatId, chatType, text, replyTo = null) {
  try {
    const botUserId = 'bot_' + BOT_CONFIG.username;
    
    const messageData = {
      text,
      uid: botUserId,
      username: BOT_CONFIG.username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isBotMessage: true
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    let collectionPath;
    if (chatType === 'group') {
      collectionPath = db.collection('groupMessages').doc(chatId).collection('messages');
    } else {
      collectionPath = db.collection('directMessages').doc(chatId).collection('messages');
    }

    await collectionPath.add(messageData);
    console.log(`🤖 Bot replied in ${chatType} ${chatId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending bot message:', error);
    return false;
  }
}

/**
 * Listen for commands in group chats
 */
exports.onGroupCommand = functions.firestore
  .document('groupMessages/{groupId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { groupId } = context.params;
    const messageData = snap.data();
    
    // Ignore bot messages
    if (messageData.isBotMessage) {
      return null;
    }
    
    const text = messageData.text || '';
    const senderId = messageData.uid;
    const username = messageData.username;
    
    // Check for custom triggers first (non-command messages)
    if (!text.startsWith('/')) {
      const triggerResponse = await checkTriggers(text, groupId, 'group');
      if (triggerResponse) {
        await sendBotMessage(groupId, 'group', triggerResponse, messageData.messageId);
      }
      return null;
    }
    
    console.log(`📝 Command detected in group ${groupId}: ${text}`);
    
    // Parse command
    const parts = text.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    // Process command
    const response = await processBotCommand(command, args, groupId, 'group', senderId);
    
    // Send response
    await sendBotMessage(groupId, 'group', response, messageData.messageId);
    
    return null;
  });

/**
 * Listen for commands in DMs
 */
exports.onDMCommand = functions.firestore
  .document('directMessages/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { chatId } = context.params;
    const messageData = snap.data();
    
    // Ignore bot messages
    if (messageData.isBotMessage) {
      return null;
    }
    
    const text = messageData.text || '';
    const senderId = messageData.uid;
    
    // Check for custom triggers first (non-command messages)
    if (!text.startsWith('/')) {
      const triggerResponse = await checkTriggers(text, chatId, 'dm');
      if (triggerResponse) {
        await sendBotMessage(chatId, 'dm', triggerResponse);
      }
      return null;
    }
    
    // Check if DM is with bot
    const [user1, user2] = chatId.split('_');
    const botUserId = 'bot_' + BOT_CONFIG.username;
    
    if (user1 !== botUserId && user2 !== botUserId) {
      // Not a DM with bot
      return null;
    }
    
    console.log(`📝 Command detected in DM ${chatId}: ${text}`);
    
    // Parse command
    const parts = text.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    // Process command
    const response = await processBotCommand(command, args, chatId, 'dm', senderId);
    
    // Send response
    await sendBotMessage(chatId, 'dm', response);
    
    return null;
  });
