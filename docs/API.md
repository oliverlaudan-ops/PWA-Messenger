# 🔌 Cloud Functions API - PWA Messenger

## 📌 Übersicht

Die PWA Messenger App nutzt Firebase Cloud Functions für serverless Backend-Logik, insbesondere für Push Notifications.

**Firebase Project:** `pwa-messenger-oliver`  
**Region:** `us-central1`  
**Runtime:** Node.js 20

---

## 🔔 Notification Functions

### onNewGroupMessage

**Trigger:** Firestore `onCreate`  
**Path:** `groupMessages/{groupId}/messages/{messageId}`  
**Purpose:** Sendet Push Notifications an Gruppenmitglieder bei neuen Nachrichten

#### Trigger Bedingung

Wird automatisch ausgelöst wenn:
```javascript
addDoc(collection(db, 'groupMessages', groupId, 'messages'), messageData)
```

#### Flow

```
1. Neue Nachricht wird in Firestore erstellt
   ↓
2. Function wird getriggert
   ↓
3. Hole Group Data (members, name)
   ↓
4. Filtere Empfänger (ohne Sender)
   ↓
5. Für jeden Empfänger:
   - Prüfe notificationsEnabled
   - Prüfe notification settings
   - Prüfe chat muted
   - Prüfe Do Not Disturb
   - Hole FCM tokens
   ↓
6. Erstelle FCM Payloads
   ↓
7. Sende via admin.messaging().sendEach()
   ↓
8. Handle Errors & cleanup invalid tokens
```

#### Input (Firestore Document)

```typescript
interface GroupMessage {
  text: string;           // Nachrichtentext
  uid: string;            // Sender User ID
  username: string;       // Sender Username
  createdAt: Timestamp;   // Zeitstempel
}
```

#### Output (FCM Payload)

```typescript
interface FCMMessage {
  token: string;          // Empfänger FCM Token
  notification: {
    title: string;        // "👥 Gruppenname"
    body: string;         // "Username: Nachricht..."
  };
  data: {
    chatId: string;       // Group ID
    chatType: 'group';    // Konstante
    chatName: string;     // Gruppenname
    senderId: string;     // Sender UID
    senderName: string;   // Sender Username
    messageId: string;    // Message ID
    unreadCount: string;  // Anzahl ungelesen
  };
  webpush: {
    fcmOptions: {
      link: string;       // Deep Link zur App
    };
    notification: {
      icon: string;       // Notification Icon
      badge: string;      // Badge Icon
      vibrate: number[];  // Vibrationsmuster
      requireInteraction: boolean;
    };
  };
}
```

#### Error Handling

**Invalid Token:**
```javascript
if (errorCode === 'messaging/invalid-registration-token') {
  // Token wird aus Firestore gelöscht
  db.collection('users').doc(userId).update({
    [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
  });
}
```

**Not Registered:**
```javascript
if (errorCode === 'messaging/registration-token-not-registered') {
  // Token wird aus Firestore gelöscht
}
```

#### Logs

**Success:**
```
📬 New group message in {groupId} from {username}
📤 Sending notifications to X devices
✅ Successfully sent X notifications
```

**Errors:**
```
❌ Group not found
ℹ️ No recipients for notification
🔕 Notifications disabled for user {userId}
🔇 Group {groupId} muted for user {userId}
🌙 DND active for user {userId}
⚠️ No valid FCM tokens found
❌ Failed to send X notifications
⚠️ Error for user {userId}: {errorCode}
```

---

### onNewDirectMessage

**Trigger:** Firestore `onCreate`  
**Path:** `directMessages/{chatId}/messages/{messageId}`  
**Purpose:** Sendet Push Notifications bei neuen Direct Messages

#### Trigger Bedingung

Wird automatisch ausgelöst wenn:
```javascript
addDoc(collection(db, 'directMessages', chatId, 'messages'), messageData)
```

**ChatId Format:** `{userId1}_{userId2}` (alphabetisch sortiert)

#### Flow

```
1. Neue DM wird in Firestore erstellt
   ↓
2. Function wird getriggert
   ↓
3. Extrahiere Empfänger aus chatId
   ↓
4. Hole Empfänger User Data
   ↓
5. Prüfe:
   - notificationsEnabled
   - notification settings
   - chat muted
   - Do Not Disturb
   ↓
6. Hole FCM tokens
   ↓
7. Hole Unread Count aus chats collection
   ↓
8. Erstelle FCM Payload
   ↓
9. Sende via admin.messaging().sendEach()
   ↓
10. Handle Errors & cleanup invalid tokens
```

#### Input (Firestore Document)

```typescript
interface DirectMessage {
  text: string;           // Nachrichtentext
  uid: string;            // Sender User ID
  username: string;       // Sender Username
  createdAt: Timestamp;   // Zeitstempel
}
```

#### Output (FCM Payload)

```typescript
interface FCMMessage {
  token: string;
  notification: {
    title: string;        // "👤 @username"
    body: string;         // "Nachricht..."
  };
  data: {
    chatId: string;       // Chat ID (userId1_userId2)
    chatType: 'dm';       // Konstante
    userId: string;       // Sender UID
    username: string;     // Sender Username
    messageId: string;    // Message ID
    unreadCount: string;  // Anzahl ungelesen
  };
  webpush: {
    fcmOptions: {
      link: string;       // Deep Link zur App
    };
    notification: {
      icon: string;
      badge: string;
      vibrate: number[];
      requireInteraction: boolean;
    };
  };
}
```

#### Logs

**Success:**
```
📬 New DM in {chatId} from {username}
✅ Successfully sent X notifications
```

**Errors:**
```
❌ Recipient not found
🔕 Notifications disabled for recipient
🔇 Chat is muted
🌙 Do Not Disturb is active
⚠️ No FCM tokens for recipient
```

---

### cleanupOldTokens

**Trigger:** Scheduled (Pub/Sub)  
**Schedule:** `every 24 hours`  
**Purpose:** Löscht FCM Tokens die älter als 30 Tage sind

#### Flow

```
1. Function wird täglich getriggert
   ↓
2. Hole alle Users aus Firestore
   ↓
3. Für jeden User:
   - Prüfe fcmTokens
   - Prüfe lastUsed Timestamp
   - Falls > 30 Tage alt: Markiere zum Löschen
   ↓
4. Batch Update: Lösche alte Tokens
   ↓
5. Log Anzahl gelöschter Tokens
```

#### Logic

```javascript
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

if (tokenData.lastUsed.toMillis() < thirtyDaysAgo) {
  // Token löschen
}
```

#### Logs

```
🧹 Cleaning up old FCM tokens...
✅ Removed X old FCM tokens
```

---

## 🔧 Deployment

### Firebase CLI

```bash
# Alle Functions deployen
cd functions
firebase deploy --only functions

# Einzelne Function deployen
firebase deploy --only functions:onNewGroupMessage
firebase deploy --only functions:onNewDirectMessage
firebase deploy --only functions:cleanupOldTokens
```

### Deployment Config

**functions/package.json:**
```json
{
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

---

## 📊 Monitoring

### Logs anzeigen

**Firebase Console:**
https://console.firebase.google.com/project/pwa-messenger-oliver/functions/logs

**Firebase CLI:**
```bash
# Alle Logs
firebase functions:log

# Nur onNewGroupMessage
firebase functions:log --only onNewGroupMessage

# Live Logs (tail)
firebase functions:log --only onNewGroupMessage --tail
```

### Metrics

**Google Cloud Console:**
https://console.cloud.google.com/functions/list?project=pwa-messenger-oliver

**Metriken:**
- Invocations (Aufrufe)
- Execution Time (Ausführungszeit)
- Memory Usage (Speicherverbrauch)
- Error Rate (Fehlerrate)

---

## 🐛 Error Handling

### Function Errors

**Problem:** Function schlägt komplett fehl

**Debugging:**
```bash
# Logs prüfen
firebase functions:log --only onNewGroupMessage

# Prüfe:
- Syntax Errors im Code?
- Firebase Admin SDK initialisiert?
- Firestore Permissions korrekt?
```

### FCM Delivery Errors

**Problem:** Notification wird nicht zugestellt

**Mögliche Ursachen:**

1. **Invalid Token:**
   ```
   messaging/invalid-registration-token
   ```
   → Token wurde automatisch gelöscht

2. **Token Not Registered:**
   ```
   messaging/registration-token-not-registered
   ```
   → User hat App deinstalliert oder Notifications disabled

3. **Quota Exceeded:**
   ```
   messaging/quota-exceeded
   ```
   → Firebase Spark Plan Limit erreicht

4. **Third Party Auth Error:**
   ```
   messaging/third-party-auth-error
   ```
   → FCM API Key Problem

### Notification Settings Errors

**Problem:** User erhält keine Notifications obwohl alles aktiviert

**Prüfe:**

1. **User Document:**
   ```javascript
   const userDoc = await db.collection('users').doc(userId).get();
   console.log(userDoc.data().notificationsEnabled); // true?
   console.log(userDoc.data().fcmTokens); // Token vorhanden?
   ```

2. **Notification Settings:**
   ```javascript
   const settings = userDoc.data().notificationSettings;
   console.log(settings.enabled); // true?
   console.log(settings.chatMuted); // Chat gemutet?
   console.log(settings.doNotDisturb); // DND aktiv?
   ```

3. **Function Logs:**
   ```
   Suche nach:
   - "🔕 Notifications disabled"
   - "🔇 Chat is muted"
   - "🌙 DND active"
   ```

---

## 🔒 Security

### IAM Permissions

**Required Roles:**
- Cloud Functions Developer
- Firebase Admin SDK Service Account
- Cloud Messaging Sender

**Prüfen:**
https://console.cloud.google.com/iam-admin/iam?project=pwa-messenger-oliver

### API Keys

**Server Key (Private):**
- Wird NICHT im Client-Code verwendet
- Nur in Cloud Functions (automatisch via Admin SDK)

**Web API Key (Public):**
- Darf im Client-Code sein
- Sicherheit via Firestore Rules

---

## 💰 Kosten

### Firebase Spark Plan (Free)

**Limits:**
- **Functions:** 125k invocations/month
- **Compute:** 40k GB-seconds
- **Network:** 5 GB outbound/month

**Aktueller Verbrauch:**
- ~500 invocations/month (~0.4%)
- ~2 GB-seconds (~5%)
- ~100 MB outbound (~2%)

### Blaze Plan (Pay-as-you-go)

**Kosten:**
- **Functions:** $0.40/million invocations
- **Compute:** $0.0000025/GB-second
- **Network:** $0.12/GB outbound

**Beispiel (10k User):**
- ~50k invocations/month: **$0.02**
- ~500 GB-seconds: **$0.00125**
- ~2 GB outbound: **$0.24**
- **Total: ~$0.26/month**

---

## 🧰 Best Practices

### Function Performance

1. **Minimize Cold Starts:**
   - Keep functions warm mit `min-instances: 1` (Blaze only)
   - Reduziere Dependencies

2. **Optimize Firestore Queries:**
   - Use Indexes
   - Limit query results
   - Cache User Data

3. **Batch Operations:**
   - Use `sendEach()` statt einzelne `send()` Calls
   - Batch Firestore Updates

### Error Handling

1. **Try-Catch Blocks:**
   ```javascript
   try {
     await sendNotifications();
   } catch (error) {
     console.error('Error:', error);
     // Nicht re-throw! Function sollte nicht crashen
     return null;
   }
   ```

2. **Invalid Token Cleanup:**
   - Immer automatisch löschen
   - Verhindert wiederholte Fehler

3. **Logging:**
   - Emoji für bessere Lesbarkeit
   - Structured Logging für Monitoring

### Security

1. **Input Validation:**
   - Prüfe alle Firestore Document Fields
   - Sanitize User Input

2. **Permission Checks:**
   - Verlasse dich auf Firestore Rules
   - Keine sensitive Logik in Functions

3. **Rate Limiting:**
   - Implementiere bei Bedarf
   - Verhindere Spam

---

**Version:** 1.0.0  
**Letztes Update:** Februar 2026  
**Maintainer:** Oliver Laudan
