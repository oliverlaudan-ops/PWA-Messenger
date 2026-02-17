# Changelog - PWA Messenger

Alle wichtigen Änderungen am PWA Messenger werden hier dokumentiert.

---

## Phase 3: Gruppen-Features (In Progress) 🚀

### 🆕 Neue Features

#### 1. Gruppen erstellen
- **Modal zum Erstellen neuer Gruppen**
  - Gruppenname (Pflichtfeld, max. 50 Zeichen)
  - Beschreibung (Optional, max. 200 Zeichen)
  - Creator wird automatisch Admin und Mitglied
- **Button "+ Neue Gruppe"** im Groups-Tab

#### 2. Firestore Struktur für Gruppen
```
groups/
  {groupId}/
    - name: string
    - description: string
    - createdBy: userId (Owner)
    - members: [userId1, userId2, ...]
    - admins: [userId1, ...]
    - createdAt: timestamp
    - lastMessage: string
    - lastMessageTime: timestamp
    - unreadCount: { userId1: 2, userId2: 0, ... }

groupMessages/
  {groupId}/
    messages/
      {messageId}/
        - text: string
        - uid: userId
        - username: string
        - createdAt: timestamp
```

### 📝 Geplant
- Gruppenliste mit letzter Nachricht und Unread Counter
- Gruppenchat (senden/empfangen in Echtzeit)
- Gruppe beitreten/verlassen
- Admin-Features (Mitglieder verwalten, Gruppe bearbeiten/löschen)

---

## Phase 2: Direktnachrichten ✅ (Abgeschlossen)

### 🆕 Neue Features

#### 1. Direktnachrichten (DM) System
- **Tab-Navigation** zwischen Gruppen und Direktnachrichten
- **DM Chat-Liste** mit:
  - Letzte Nachricht Vorschau
  - Zeitstempel (heute nur Zeit, gestern "Gestern + Zeit", älter volle Datum)
  - Sortierung nach letzter Aktivität
- **DM Chat-Ansicht**:
  - Echtzeit-Nachrichten
  - Timestamps bei jeder Nachricht
  - Zurück-Button zur Chat-Liste
  - Auto-Scroll zu neuesten Nachrichten

#### 2. Unread Counter mit Badge
- **Roter Badge** in Chat-Liste mit Anzahl ungelesener Nachrichten
- **Badge verschwindet** beim Öffnen des Chats
- **Counter wird aktualisiert** in Echtzeit
- **Firestore Struktur** für Unread Counts:
  ```
  chats/{chatId}/
    - unreadCount: { userId1: 3, userId2: 0 }
  ```

#### 3. User Search Modal
- **Modal zum Starten neuer Chats**
- **Suche** nach Username oder E-Mail
- **Filterfunktion** in Echtzeit
- Liste aller verfügbaren User (außer sich selbst)

### 🐛 Bug Fixes
- **Fix: Nachrichten erscheinen jetzt im Verlauf**
  - Problem: `limit(50)` lud nur älteste 50 Nachrichten
  - Lösung: Query mit `orderBy('createdAt', 'desc')` lädt neueste 50
  - Nachrichten werden beim Initial Load umgedreht für richtige Reihenfolge

### 🧹 Code Cleanup
- Entfernung aller Debug-Logs (außer Error Logging)
- Console ist jetzt sauber und übersichtlich

---

## Phase 1: Basic Setup ✅ (Abgeschlossen)

### 🆕 Neue Features

#### 1. Firebase Authentication
- **Login** mit E-Mail und Passwort
- **Registrierung** für neue Benutzer
- **Logout** Funktion
- Fehlerbehandlung für alle Auth-Operationen

#### 2. Username System
- **Username Setup** nach Registrierung
- Validierung:
  - 3-20 Zeichen
  - Nur Kleinbuchstaben, Zahlen und Unterstrich
  - Eindeutigkeit (keine Duplikate)
- Username wird in Firestore gespeichert unter `users/{uid}`

#### 3. Gruppenchat (Global)
- **Echtzeit-Nachrichten** mit Firestore `onSnapshot`
- **Timestamps** bei jeder Nachricht
- **Username-Anzeige** bei jeder Nachricht
- Auto-Scroll zu neuesten Nachrichten
- Limit: 50 neueste Nachrichten

#### 4. UI/UX
- **Responsive Design** (Mobile-First)
- **Screen Management**:
  - Login Screen
  - Register Screen
  - Username Setup Screen
  - Chat Screen
- **Modern Design** mit Gradients und Glasmorphism
- **Loading States** (Spinner während Daten laden)
- **Error Messages** mit Auto-Hide (5 Sekunden)

#### 5. PWA Features
- **Manifest.json** für App-Installation
- **Service Worker** (Basic Setup)
- **Meta Tags** für Mobile Optimization
- **Theme Color** (#667eea)

### 🗄️ Firestore Struktur

```
users/
  {uid}/
    - username: string
    - email: string
    - createdAt: timestamp

messages/ (Global Group Chat)
  {messageId}/
    - text: string
    - uid: userId
    - username: string
    - createdAt: timestamp

chats/ (DM Metadata)
  {chatId}/
    - participants: [userId1, userId2]
    - lastMessage: string
    - lastMessageTime: timestamp
    - unreadCount: { userId1: 0, userId2: 3 }

directMessages/
  {chatId}/
    messages/
      {messageId}/
        - text: string
        - uid: userId
        - username: string
        - createdAt: timestamp
```

### 🎨 Design Features
- **Color Scheme**: Lila-Blau Gradient (#667eea → #764ba2)
- **Card-Based Layout** mit Shadows
- **Smooth Transitions** und Hover-Effekte
- **Custom Scrollbar** (WebKit)
- **Avatar Bubbles** (Ersten Buchstabe des Usernames)

### 📱 PWA Manifest
- **Name**: PWA Messenger
- **Icons**: 192x192 und 512x512
- **Display**: standalone
- **Theme**: #667eea

---

## Technische Details

### Tech Stack
- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Backend**: Firebase (Firestore + Auth)
- **CSS**: Custom CSS mit CSS Variables
- **PWA**: Service Worker + Manifest

### Firestore Security Rules (TODO)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user doc
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Anyone authenticated can read/write messages (for now)
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    // DM chats - only participants can read/write
    match /chats/{chatId} {
      allow read, write: if request.auth.uid in resource.data.participants;
    }
    
    match /directMessages/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null; // TODO: Check participants
    }
    
    // Groups - only members can read/write
    match /groups/{groupId} {
      allow read: if request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid in resource.data.admins;
    }
    
    match /groupMessages/{groupId}/messages/{messageId} {
      allow read: if request.auth != null; // TODO: Check group membership
      allow write: if request.auth != null;
    }
  }
}
```

### Performance Optimizations
- **User Data Caching** (in-memory Cache für geladene User-Daten)
- **Pagination** mit `limit(50)` für Nachrichten
- **DESC Order + Reverse** für effizientes Laden neuester Nachrichten

---

## Known Issues & TODOs

### 🐛 Known Issues
- Keine bekannten kritischen Bugs

### 📝 TODOs
- [ ] Firestore Security Rules implementieren
- [ ] Service Worker für Offline-Support
- [ ] Push Notifications
- [ ] Image/File Upload
- [ ] Typing Indicators
- [ ] Read Receipts
- [ ] Message Reactions
- [ ] User Profiles (Avatar, Bio, Status)
- [ ] Gruppe verlassen/löschen
- [ ] Admin Panel für Gruppen
- [ ] Search in Messages
- [ ] Dark Mode
- [ ] Emoji Picker
- [ ] Link Previews
- [ ] Voice Messages

---

## Contributors
- **Oliver Laudan** (@oliverlaudan-ops) - Main Developer
- **Perplexity AI** - Development Assistant
