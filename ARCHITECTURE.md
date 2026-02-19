# 🏛️ Architektur-Dokumentation - PWA Messenger

## 📊 System-Übersicht

```
┌──────────────────────────────────────────────────┐
│                   BROWSER (Client)                      │
│                                                          │
│  ┌──────────────────────────────────────────┐  │
│  │           PWA Messenger UI                    │  │
│  │   (HTML + CSS + JavaScript Modules)         │  │
│  └──────────────────────────────────────────┘  │
│                       │                              │
│                       │                              │
│  ┌──────────────────────────────────────────┐  │
│  │         Service Workers                    │  │
│  │  - sw.js (Caching)                       │  │
│  │  - firebase-messaging-sw.js (FCM)        │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
                       │
                       │ Firebase SDK
                       │
┌──────────────────────────────────────────────────┐
│            FIREBASE / GOOGLE CLOUD                   │
│                                                          │
│  ┌──────────────────────────────────────────┐  │
│  │      Firebase Authentication              │  │
│  │   (Email/Password + User Management)       │  │
│  └──────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────┐  │
│  │        Cloud Firestore                     │  │
│  │  - users                                 │  │
│  │  - groups                                │  │
│  │  - groupMessages/{id}/messages           │  │
│  │  - chats                                 │  │
│  │  - directMessages/{id}/messages          │  │
│  └──────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────┐  │
│  │       Cloud Functions                     │  │
│  │  - onNewGroupMessage                     │  │
│  │  - onNewDirectMessage                    │  │
│  │  - cleanupOldTokens                      │  │
│  └──────────────────────────────────────────┘  │
│                       │                              │
│                       │ FCM v1 API                 │
│                       ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │  Firebase Cloud Messaging (FCM)          │  │
│  │    Push Notification Delivery             │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 📦 Modul-Architektur

### Frontend Module (ES6 Modules)

```javascript
app.js
  │
  ├── modules/state.js          // ⭐ Core: Firebase Init + Global State
  │     │
  │     ├── Firebase App
  │     ├── Auth Instance
  │     └── Firestore Instance
  │
  ├── modules/auth.js           // Authentication Logic
  │     ├── Login
  │     ├── Signup
  │     ├── Logout
  │     └── Username Setup
  │
  ├── modules/ui.js             // UI Utilities
  │     ├── Screen Management
  │     ├── Error Display
  │     └── Timestamp Formatting
  │
  ├── modules/users.js          // User Management
  │     ├── User Search
  │     ├── User Cache
  │     └── User Data Loading
  │
  ├── modules/groups.js         // Group Chat Logic
  │     ├── Group Creation
  │     ├── Group List
  │     ├── Group Messages
  │     └── Unread Count Management
  │
  ├── modules/groupMembers.js   // Group Member Management
  │     ├── Add Members
  │     ├── View Members
  │     └── Member Display
  │
  ├── modules/directMessages.js // DM Logic
  │     ├── DM Chat List
  │     ├── DM Messages
  │     ├── Chat Metadata
  │     └── Unread Count Management
  │
  └── modules/notifications.js  // Push Notifications
        ├── FCM Token Management
        ├── Permission Request
        ├── Foreground Listener
        └── Settings Management
```

---

## 🔄 Datenfluss

### Nachricht senden (Gruppe)

```
User tippt Nachricht
       ↓
modules/groups.js: sendGroupMessage()
       ↓
Firestore.addDoc(groupMessages/{groupId}/messages)
       ↓
[📥 Firestore onCreate Trigger]
       ↓
Cloud Function: onNewGroupMessage()
       ↓
Hole Group Members aus Firestore
       ↓
Prüfe Notification Settings je User
       ↓
Hole FCM Tokens aus Firestore
       ↓
FCM v1 API: sendEach(messages)
       ↓
[📤 FCM sendet zu allen Devices]
       ↓
firebase-messaging-sw.js: onBackgroundMessage()
       ↓
Browser zeigt System Notification
       ↓
User klickt Notification
       ↓
App öffnet / fokussiert
       ↓
Navigiert zu Chat
```

### Real-time Message Update

```
User A sendet Nachricht
       ↓
Firestore: groupMessages/{groupId}/messages
       ↓
[📡 Firestore onSnapshot Listener]
       ↓
User B's Browser empfängt Update
       ↓
modules/groups.js: appendGroupMessage()
       ↓
DOM Update: Nachricht wird angezeigt
       ↓
Unread Badge Update
```

---

## 🛠️ Service Worker Architektur

### sw.js (App Shell Caching)

**Purpose:** PWA Offline-Fähigkeit

**Cached Resources:**
```javascript
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/firebase.js',
  '/manifest.json',
  '/modules/*.js'
];
```

**Strategy:**
- **Cache-First** für statische Assets
- **Network-First** für Firebase Requests
- **Fallback** zu Cache bei Offline

### firebase-messaging-sw.js (Push Notifications)

**Purpose:** FCM Background Message Handling

**Lifecycle:**
```
1. Registration
   navigator.serviceWorker.register('/firebase-messaging-sw.js')

2. FCM Token Generation
   getToken(messaging, { vapidKey, serviceWorkerRegistration })

3. Background Message Receive
   messaging.onBackgroundMessage(payload => {...})

4. Notification Display
   self.registration.showNotification(title, options)

5. Notification Click
   notificationclick Event → Open/Focus App
```

---

## 💾 Datenbank-Design

### Collection Struktur

```
firestore/
├── users/
│   ├── {userId}
│   │   ├── username: string
│   │   ├── email: string
│   │   ├── createdAt: timestamp
│   │   ├── fcmTokens: map<token, tokenData>
│   │   └── notificationSettings: object
│
├── groups/
│   ├── {groupId}
│   │   ├── name: string
│   │   ├── description: string
│   │   ├── members: array<userId>
│   │   ├── admins: array<userId>
│   │   ├── createdBy: userId
│   │   ├── lastMessage: string
│   │   ├── lastMessageTime: timestamp
│   │   └── unreadCount: map<userId, number>
│
├── groupMessages/
│   ├── {groupId}/
│   │   ├── messages/
│   │   │   ├── {messageId}
│   │   │   │   ├── text: string
│   │   │   │   ├── uid: userId
│   │   │   │   ├── username: string
│   │   │   │   └── createdAt: timestamp
│
├── chats/
│   ├── {userId1_userId2}
│   │   ├── participants: array<userId>
│   │   ├── lastMessage: string
│   │   ├── lastMessageTime: timestamp
│   │   └── unreadCount: map<userId, number>
│
└── directMessages/
    ├── {userId1_userId2}/
    │   ├── messages/
    │   │   ├── {messageId}
    │   │   │   ├── text: string
    │   │   │   ├── uid: userId
    │   │   │   ├── username: string
    │   │   │   └── createdAt: timestamp
```

### Query Patterns

**Get User's Groups:**
```javascript
query(
  collection(db, 'groups'),
  where('members', 'array-contains', userId),
  orderBy('lastMessageTime', 'desc')
)
```

**Get Group Messages:**
```javascript
query(
  collection(db, 'groupMessages', groupId, 'messages'),
  orderBy('createdAt', 'desc'),
  limit(50)
)
```

**Get User's DM Chats:**
```javascript
query(
  collection(db, 'chats'),
  where('participants', 'array-contains', userId),
  orderBy('lastMessageTime', 'desc')
)
```

---

## 🔐 Security Architecture

### Multi-Layer Security

```
┌──────────────────────────────────────────────────┐
│  Layer 1: Firebase Authentication                     │
│  - Email/Password with bcrypt hashing                │
│  - Session management via Firebase Auth Tokens       │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│  Layer 2: Firestore Security Rules                   │
│  - Allow read: if request.auth != null               │
│  - Allow write: if request.auth.uid == resource.uid  │
│  - Group access: if uid in group.members             │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│  Layer 3: Application Logic                          │
│  - Client-side validation                            │
│  - Input sanitization                                │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│  Layer 4: HTTPS / TLS                                │
│  - All traffic encrypted                             │
│  - Enforced via GitHub Pages                         │
└──────────────────────────────────────────────────┘
```

---

## ⚡ Performance Optimierungen

### Frontend

**1. Lazy Loading:**
- Modules werden on-demand geladen
- Service Worker cached bei erstem Load

**2. Firestore Queries:**
- `limit(50)` auf Message Queries
- Index auf `lastMessageTime` für schnelle Sortierung
- User Cache verhindert redundante DB Calls

**3. Real-time Listeners:**
- Nur aktive Chats haben Listener
- Listener werden bei Tab-Wechsel cleanup

### Backend

**1. Cloud Functions:**
- Minimale Cold-Start Zeit durch Node.js 20
- Batch FCM Sends mit `sendEach()`
- Invalid Token Cleanup reduziert Payload

**2. Firestore:**
- Compound Indexes für komplexe Queries
- Denormalisierung (lastMessage in groups)
- Subcollections für Messages (bessere Skalierung)

---

## 📊 Skalierbarkeit

### Aktuelle Limits (Firebase Spark Plan)

| Resource | Limit | Aktuelle Nutzung |
|----------|-------|------------------|
| Firestore Reads | 50k/day | ~100/day |
| Firestore Writes | 20k/day | ~50/day |
| Functions Invocations | 125k/month | ~500/month |
| Concurrent Connections | 100k | ~10 |

### Skalierungs-Strategie

**Phase 1: < 1000 User**
- ✅ Spark Plan ausreichend
- ✅ Keine Änderungen nötig

**Phase 2: 1000 - 10k User**
- 🟡 Upgrade zu Blaze Plan
- 🟡 Firestore Indexes optimieren
- 🟡 Message Batching implementieren

**Phase 3: > 10k User**
- 🔴 Multi-Region Deployment
- 🔴 CDN für statische Assets
- 🔴 Message Queue für FCM
- 🔴 Database Sharding

---

## 🧰 Design Patterns

### Observer Pattern
**Verwendung:** Real-time Updates via Firestore `onSnapshot`

### Singleton Pattern
**Verwendung:** Firebase App Instance, Global State

### Module Pattern
**Verwendung:** ES6 Modules mit Export/Import

### Factory Pattern
**Verwendung:** Nachrichtenformat-Erstellung

---

**Version:** 1.0.0  
**Letztes Update:** Februar 2026  
**Architektur Status:** ✅ Production Stable
