/**
 * Firebase Cloud Functions for PWA Messenger
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize functions: firebase init functions
 * 4. Deploy: firebase deploy --only functions
 * 
 * SETUP:
 * cd functions
 * npm install
 * 
 * This file contains:
 * - Push notification triggers for new messages
 * - FCM token management
 * - Badge count calculations
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

      console.log(`New group message in ${groupId} from ${username}`);

      // Get group data
      const groupDoc = await db.collection('groups').doc(groupId).get();
      if (!groupDoc.exists) {
        console.log('Group not found');
        return null;
      }

      const groupData = groupDoc.data();
      const { name: groupName, members } = groupData;

      // Send notification to all members except sender
      const recipientIds = members.filter(memberId => memberId !== senderId);

      if (recipientIds.length === 0) {
        console.log('No recipients for notification');
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
              continue;
            }
          }

          // Skip if Do Not Disturb is active
          if (settings.doNotDisturb) {
            if (!settings.doNotDisturbUntil || Date.now() < settings.doNotDisturbUntil) {
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
        console.log('No valid FCM tokens found');
        return null;
      }

      console.log(`Sending notifications to ${tokens.length} devices`);

      // Prepare notification payload
      const notificationTitle = `👥 ${groupName}`;
      const notificationBody = `${username}: ${text.length > 100 ? text.substring(0, 100) + '...' : text}`;

      // Send notifications
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
          }
        }
      }));

      const results = await admin.messaging().sendAll(messages);
      
      console.log(`Successfully sent ${results.successCount} notifications`);
      if (results.failureCount > 0) {
        console.log(`Failed to send ${results.failureCount} notifications`);
        
        // Clean up invalid tokens
        results.responses.forEach((result, index) => {
          if (!result.success) {
            const { token, userId } = tokens[index];
            console.log(`Removing invalid token for user ${userId}`);
            // Remove invalid token
            db.collection('users').doc(userId).update({
              [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
            });
          }
        });
      }

      return null;
    } catch (error) {
      console.error('Error sending group message notification:', error);
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

      console.log(`New DM in ${chatId} from ${username}`);

      // Extract recipient ID from chatId (format: userId1_userId2)
      const [user1, user2] = chatId.split('_');
      const recipientId = user1 === senderId ? user2 : user1;

      // Get recipient's user data
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      if (!recipientDoc.exists) {
        console.log('Recipient not found');
        return null;
      }

      const recipientData = recipientDoc.data();

      // Check if notifications are enabled
      if (recipientData.notificationsEnabled === false) {
        console.log('Notifications disabled for recipient');
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
          console.log('Chat is muted');
          return null;
        }
      }

      // Check Do Not Disturb
      if (settings.doNotDisturb) {
        if (!settings.doNotDisturbUntil || Date.now() < settings.doNotDisturbUntil) {
          console.log('Do Not Disturb is active');
          return null;
        }
      }

      // Get FCM tokens
      if (!recipientData.fcmTokens) {
        console.log('No FCM tokens for recipient');
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
          }
        }
      }));

      const results = await admin.messaging().sendAll(messages);
      
      console.log(`Successfully sent ${results.successCount} notifications`);
      if (results.failureCount > 0) {
        console.log(`Failed to send ${results.failureCount} notifications`);
        
        // Clean up invalid tokens
        results.responses.forEach((result, index) => {
          if (!result.success) {
            const token = tokens[index];
            console.log(`Removing invalid token`);
            db.collection('users').doc(recipientId).update({
              [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
            });
          }
        });
      }

      return null;
    } catch (error) {
      console.error('Error sending DM notification:', error);
      return null;
    }
  });

/**
 * Clean up old FCM tokens (run daily)
 */
exports.cleanupOldTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Cleaning up old FCM tokens...');
    
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
    
    console.log(`Removed ${tokensRemoved} old FCM tokens`);
    return null;
  });
