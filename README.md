# 📱 PWA Messenger

> Eine moderne Progressive Web App (PWA) für Real-time Messaging mit Push Notifications, entwickelt mit Firebase.

**Live Demo:** [https://messenger.future-pulse.tech](https://messenger.future-pulse.tech)

---

## 🎯 Features

### ✅ Implementierte Features

#### Core Messaging
- **Real-time Messaging** - Instant Message Delivery via Firestore
- **Gruppen-Chats** - Erstelle und verwalte Gruppenchats
- **Direct Messages (DMs)** - 1-zu-1 Privatnachrichten
- **Unread Badges** - Visuelles Feedback für ungelesene Nachrichten
- **Message History** - Vollständiger Nachrichtenverlauf

#### Benachrichtigungen
- **Push Notifications** - Browser Push Notifications (Desktop & Mobile)
- **Background Notifications** - Benachrichtigungen auch wenn App geschlossen
- **Notification Settings** - Aktivieren/Deaktivieren per Toggle
- **Smart Notifications** - Nur bei neuen Nachrichten von anderen Usern

#### Progressive Web App (PWA)
- **Installierbar** - Als native App installierbar auf Desktop & Mobile
- **Offline-fähig** - Service Worker cached App-Shell
- **App-like Experience** - Voller Bildschirm ohne Browser-UI
- **Fast Loading** - Optimierte Performance mit Caching

#### User Management
- **Firebase Authentication** - E-Mail/Passwort Login
- **Benutzernamen-System** - Eindeutige @usernames
- **User Search** - Suche nach Benutzern für DMs
- **User Avatars** - Initialen-basierte Avatare

---

## 🏗️ Technologie-Stack

### Frontend
- **Vanilla JavaScript (ES6+)** - Modular mit ES Modules
- **HTML5 & CSS3** - Modernes, responsives Design
- **Service Worker** - PWA & Push Notifications
- **Firebase SDK v10.13.1**
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Cloud Messaging (FCM)

### Backend
- **Firebase Cloud Functions** - Serverless Node.js Functions
- **Cloud Firestore** - NoSQL Real-time Database
- **Firebase Cloud Messaging** - Push Notification Delivery

### Deployment
- **GitHub Actions** - Automated CI/CD Pipeline
- **GitHub Pages** - Static Site Hosting
- **Custom Domain** - messenger.future-pulse.tech

---

## 📁 Projekt-Struktur

```
PWA-Messenger/
├── index.html                 # Main HTML file
├── styles.css                # Global styles
├── app.js                    # App initialization
├── firebase.js               # Legacy Firebase config (backup)
├── manifest.json             # PWA Manifest
├── sw.js                     # Main Service Worker (caching)
├── firebase-messaging-sw.js  # FCM Service Worker (notifications)
│
├── modules/                  # JavaScript Modules
│   ├── state.js             # Global state & Firebase init
│   ├── auth.js              # Authentication logic
│   ├── ui.js                # UI utilities
│   ├── users.js             # User management
│   ├── groups.js            # Group chat logic
│   ├── groupMembers.js      # Group member management
│   ├── directMessages.js    # DM logic
│   └── notifications.js     # Push notification handling
│
├── functions/               # Firebase Cloud Functions
│   ├── index.js            # Function definitions
│   ├── package.json        # Node.js dependencies
│   └── .firebaserc         # Firebase project config
│
├── icons/                   # PWA Icons
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── icon-96x96.png
│
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions deployment
```

---

## 🔧 Setup & Installation

### Voraussetzungen

- **Node.js** (v18+)
- **npm** oder **yarn**
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**

### Lokale Entwicklung

#### 1. Repository klonen

```bash
git clone https://github.com/oliverlaudan-ops/PWA-Messenger.git
cd PWA-Messenger
```

#### 2. Firebase Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Erstelle neues Projekt
3. Aktiviere:
   - **Authentication** (E-Mail/Passwort)
   - **Cloud Firestore**
   - **Cloud Messaging**

#### 3. Firebase Config eintragen

**Dateien die aktualisiert werden müssen:**
- `modules/state.js`
- `firebase.js` (Legacy backup)
- `firebase-messaging-sw.js`

**Firebase Config:**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

#### 4. VAPID Key für FCM

1. Firebase Console → Project Settings → Cloud Messaging
2. Web Push certificates → Generate key pair
3. Kopiere den Key
4. Trage in `modules/notifications.js` ein:

```javascript
const VAPID_KEY = 'YOUR_VAPID_KEY';
```

#### 5. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups
    match /groups/{groupId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.members;
    }
    
    // Group Messages
    match /groupMessages/{groupId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Direct Messages
    match /directMessages/{chatId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Chats (DM metadata)
    match /chats/{chatId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants;
      allow write: if request.auth != null;
    }
  }
}
```

#### 6. Cloud Functions deployen

```bash
cd functions
npm install
firebase login
firebase deploy --only functions
```

#### 7. Lokalen Development Server starten

```bash
# Mit Python
python3 -m http.server 8000

# ODER mit Node.js
npx http-server -p 8000
```

Öffne: `http://localhost:8000`

---

## 🚀 Deployment

### Automatisches Deployment (GitHub Actions)

Bei jedem Push auf `main` Branch:

1. GitHub Actions startet automatisch
2. Deployed auf GitHub Pages
3. Erreichbar unter: `https://messenger.future-pulse.tech`

**Workflow Datei:** `.github/workflows/deploy.yml`

### Manuelles Deployment

```bash
# Frontend
git add .
git commit -m "Update"
git push origin main

# Functions
cd functions
firebase deploy --only functions
```

---

## 🔔 Push Notifications - Technische Details

### Architektur

```
User sendet Nachricht
     ↓
Firestore onCreate Trigger
     ↓
Cloud Function (onNewGroupMessage / onNewDirectMessage)
     ↓
Prüft Empfänger Notification Settings
     ↓
Sendet FCM Message an Token
     ↓
firebase-messaging-sw.js empfängt
     ↓
Browser zeigt System Notification
```

### Service Worker Registrierung

**Zwei Service Workers:**

1. **`sw.js`** - App Shell Caching, Offline-Funktionalität
2. **`firebase-messaging-sw.js`** - Push Notifications (FCM)

### FCM Token Lifecycle

```javascript
// 1. Permission Request
Notification.requestPermission()

// 2. Token Generation
getToken(messaging, { vapidKey, serviceWorkerRegistration })

// 3. Token Storage
Firestore: users/{userId}/fcmTokens/{token}

// 4. Token Cleanup (nach 30 Tagen inaktiv)
Cloud Function: cleanupOldTokens
```

### Notification Payload

```javascript
{
  notification: {
    title: "👥 Gruppenname",
    body: "Username: Nachrichtentext"
  },
  data: {
    chatId: "group_123",
    chatType: "group",
    senderId: "user_456",
    unreadCount: "3"
  },
  webpush: {
    fcmOptions: {
      link: "https://messenger.future-pulse.tech/?openChat=group_123"
    }
  }
}
```

---

## 📊 Datenbank-Schema

### Collections

#### `users`
```javascript
{
  userId: {
    username: "john_doe",
    email: "john@example.com",
    createdAt: Timestamp,
    fcmTokens: {
      "token_abc123": {
        createdAt: Timestamp,
        lastUsed: Timestamp,
        userAgent: "Mozilla/5.0..."
      }
    },
    notificationsEnabled: true,
    notificationSettings: {
      enabled: true,
      sound: true,
      chatMuted: {},
      doNotDisturb: false
    }
  }
}
```

#### `groups`
```javascript
{
  groupId: {
    name: "Team Chat",
    description: "Projektbesprechungen",
    members: ["userId1", "userId2"],
    admins: ["userId1"],
    createdBy: "userId1",
    createdAt: Timestamp,
    lastMessage: "Letzte Nachricht...",
    lastMessageTime: Timestamp,
    unreadCount: {
      "userId2": 3
    }
  }
}
```

#### `groupMessages/{groupId}/messages`
```javascript
{
  messageId: {
    text: "Nachrichtentext",
    uid: "userId1",
    username: "john_doe",
    createdAt: Timestamp
  }
}
```

#### `chats`
```javascript
{
  "userId1_userId2": {
    participants: ["userId1", "userId2"],
    lastMessage: "Hey!",
    lastMessageTime: Timestamp,
    unreadCount: {
      "userId2": 1
    }
  }
}
```

#### `directMessages/{chatId}/messages`
```javascript
{
  messageId: {
    text: "DM Text",
    uid: "userId1",
    username: "john_doe",
    createdAt: Timestamp
  }
}
```

---

## 🔐 Sicherheit

### Firebase Security Rules

- ✅ Nur authentifizierte User haben Zugriff
- ✅ User können nur eigene Daten ändern
- ✅ Gruppenmitglieder sehen nur ihre Gruppen
- ✅ DM-Teilnehmer sehen nur ihre Chats

### API Keys

- Firebase Web API Keys sind **öffentlich** (designed für Client-Side)
- Sicherheit wird durch Firestore Rules erzwungen
- Server Keys (für Cloud Functions) sind privat

### Best Practices

- ✅ Keine sensitiven Daten im Client-Code
- ✅ Firestore Rules validieren alle Zugriffe
- ✅ FCM Tokens werden nach 30 Tagen gelöscht
- ✅ Passwords werden von Firebase Auth gehashed

---

## 🧪 Testing

### Lokales Testing

```bash
# 1. Lokalen Server starten
python3 -m http.server 8000

# 2. Browser öffnen
http://localhost:8000

# 3. Zwei Browser-Fenster öffnen
# - Browser 1: User A
# - Browser 2: User B

# 4. Push Notifications testen:
# - Browser 1: In Hintergrund (anderer Tab)
# - Browser 2: Nachricht senden
# - Browser 1: Notification sollte erscheinen
```

### Cloud Functions lokal testen

```bash
cd functions
npm run serve
```

### Firestore Emulator

```bash
firebase emulators:start
```

---

## 📱 PWA Installation

### Desktop (Chrome/Edge)

1. Öffne https://messenger.future-pulse.tech
2. Adressleiste → "⊕ Installieren" Button
3. Bestätige Installation
4. App öffnet sich als standalone Window

### Mobile (iOS Safari)

1. Öffne https://messenger.future-pulse.tech
2. Teilen-Button → "Zum Home-Bildschirm"
3. Bestätige
4. App erscheint als Icon auf Home-Screen

### Mobile (Android Chrome)

1. Öffne https://messenger.future-pulse.tech
2. Menü → "App installieren"
3. Bestätige
4. App erscheint in App-Drawer

---

## 🐛 Troubleshooting

### Push Notifications funktionieren nicht

**Problem:** Keine Notifications bei neuen Nachrichten

**Lösungen:**

1. **Permission prüfen:**
   ```javascript
   console.log(Notification.permission); // Sollte "granted" sein
   ```

2. **Service Worker prüfen:**
   - F12 → Application → Service Workers
   - `firebase-messaging-sw.js` sollte aktiv sein

3. **FCM Token prüfen:**
   - F12 → Console
   - Sollte: `📱 FCM Token: ...` zeigen

4. **Cloud Functions Logs prüfen:**
   - https://console.firebase.google.com/project/pwa-messenger-oliver/functions/logs
   - Sollte: "✅ Successfully sent X notifications"

5. **App muss im Hintergrund sein:**
   - Wechsle zu anderem Tab
   - Oder minimiere Browser

### Service Worker Update

**Problem:** Neue Version wird nicht geladen

**Lösung:**
```javascript
// F12 → Application → Service Workers
// Klicke "Unregister" bei allen Workers
// Hard Reload: Ctrl+Shift+R
```

### Firestore Permission Denied

**Problem:** `permission-denied` Error

**Lösung:**
- Prüfe Firestore Rules in Firebase Console
- Stelle sicher dass User eingeloggt ist
- Prüfe ob User Mitglied der Gruppe ist

---

## 🚀 Zukünftige Features (Roadmap)

### Priorität 1 (Geplant)
- [ ] **Chat Mute** - Einzelne Chats stummschalten
- [ ] **Typing Indicators** - "XY schreibt..."
- [ ] **Read Receipts** - Gesehen-Status bei Nachrichten

### Priorität 2 (Nice-to-have)
- [ ] **Message Reactions** - Emoji Reactions (👍❤️😂)
- [ ] **Image/File Uploads** - Bilder & Dateien senden
- [ ] **Voice Messages** - Sprachnachrichten aufnehmen
- [ ] **Group Admin Features** - Mitglieder hinzufügen/entfernen
- [ ] **User Profiles** - Profilbilder & Status
- [ ] **Search** - Nachrichten durchsuchen
- [ ] **Dark Mode** - Dunkles Theme

---

## 📄 Lizenz

MIT License - Siehe LICENSE Datei

---

## 👤 Autor

**Oliver Laudan**
- GitHub: [@oliverlaudan-ops](https://github.com/oliverlaudan-ops)
- Email: oliver.laudan@gmail.com

---

## 🙏 Credits

- **Firebase** - Backend Infrastructure
- **Google Cloud** - Hosting & Functions
- **GitHub** - Code Hosting & CI/CD

---

## 📞 Support

Bei Fragen oder Problemen:

1. **GitHub Issues** - [Issues erstellen](https://github.com/oliverlaudan-ops/PWA-Messenger/issues)
2. **Email** - oliver.laudan@gmail.com

---

**Version:** 1.0.0  
**Letztes Update:** Februar 2026  
**Status:** ✅ Production Ready
