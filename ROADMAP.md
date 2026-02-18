# PWA Messenger - Development Roadmap

## 📅 Project Overview

**Repository**: https://github.com/oliverlaudan-ops/PWA-Messenger

**Live URL**: https://messenger.future-pulse.tech

**Started**: February 13, 2026

**Tech Stack**:
- Frontend: HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- Backend: Firebase (Auth, Firestore, Hosting)
- Architecture: Modular (7 modules)
- PWA: Service Worker, Manifest
- Deployment: GitHub Actions → Firebase Hosting

---

## ✅ Completed Features

### Phase 1: Basic Setup (Feb 13, 2026)

#### 🔐 Authentication & User Management
- [x] Email/Password Registration
- [x] Email/Password Login
- [x] Username System (unique, 3-20 chars, lowercase)
- [x] User Profile Storage (Firestore `users` collection)
- [x] Session Management (Firebase Auth State)
- [x] Logout Functionality

#### 👥 Group Chat (Global)
- [x] Public Test Group
- [x] Real-time Message Sync (Firestore `onSnapshot`)
- [x] Message Display with Username
- [x] Send Messages with Enter Key
- [x] Auto-scroll to Latest Message
- [x] Message Limit: Last 50 Messages

#### 🎨 UI/UX
- [x] Modern Gradient Design (Purple/Blue)
- [x] Responsive Layout (Mobile + Desktop)
- [x] Loading Spinners
- [x] Error Messages with Auto-hide

---

### Phase 2: Direct Messages (Feb 13, 2026)

#### 💬 1-on-1 Messaging
- [x] Tab Navigation (Groups / Direct Messages)
- [x] User Search Modal
  - Search by @username or email
  - Real-time filtering
  - Avatar display (first letter)
- [x] DM Chat View
  - Separate chat window
  - Back button navigation
  - Real-time message sync
- [x] Chat ID System: Sorted UIDs (`uid1_uid2`)
- [x] Firestore Structure: `directMessages/{chatId}/messages/`
- [x] Send/Receive DMs in Real-time

#### 🔔 Unread Counter
- [x] Roter Badge in Chat-Liste
- [x] Badge verschwindet beim Öffnen
- [x] Echtzeit-Updates
- [x] Firestore: `unreadCount` pro User

#### 🕒 Timestamps
- [x] Zeitstempel bei jeder Nachricht
- [x] Format:
  - Heute: "14:35"
  - Gestern: "Gestern 14:35"
  - Älter: "12.02.2026 14:35"
- [x] DM Overview (Chat Liste)
  - Letzte Nachricht Vorschau
  - Sortierung nach Aktivität

---

### Phase 3: Gruppen-Features (Feb 16-17, 2026)

#### 👥 Gruppen erstellen
- [x] Modal zum Erstellen neuer Gruppen
- [x] Gruppenname (3-50 Zeichen)
- [x] Beschreibung (optional, max. 200 Zeichen)
- [x] Creator wird automatisch Admin
- [x] Validierung

#### 📋 Gruppenliste
- [x] Liste aller Gruppen des Users
- [x] Letzte Nachricht Vorschau
- [x] Zeitstempel
- [x] Mitgliederzahl
- [x] Sortierung nach Aktivität
- [x] Unread Badge (roter Kreis)
- [x] Empty State

#### 💬 Gruppenchat
- [x] Echtzeit-Gruppennachrichten
- [x] Timestamps
- [x] Auto-Scroll
- [x] Limit: 50 neueste Nachrichten
- [x] Group Header mit Mitgliederzahl
- [x] "👥 Mitglieder" Button
- [x] Zurück zur Gruppenliste

#### 👥 Gruppenmitglieder anzeigen
- [x] Modal mit Mitgliederliste
- [x] Badges: 👑 Creator, ⚡ Admin
- [x] Username und E-Mail
- [x] Mitgliederzahl im Header

---

### Phase 4: Modular Architecture (Feb 18, 2026)

#### ♻️ Refactoring
- [x] firebase.js (35KB) → 7 Module
- [x] `modules/state.js` - Firebase init & shared state
- [x] `modules/ui.js` - UI helpers & formatting
- [x] `modules/users.js` - User search & caching
- [x] `modules/auth.js` - Authentication
- [x] `modules/groups.js` - Group functionality
- [x] `modules/directMessages.js` - DM functionality
- [x] `modules/groupMembers.js` - Member management
- [x] `app.js` - Main entry point

#### ✅ Vorteile
- [x] Übersichtlicher Code
- [x] Leichter wartbar
- [x] Einfach erweiterbar
- [x] Wiederverwendbare Module
- [x] Einzeln testbar

---

### Phase 5: Gruppenmitgliederverwaltung (Feb 18, 2026)

#### 🔐 Permission-System
- [x] 3 Rollen: Creator (👑), Admin (⚡), Member (👤)
- [x] Rollenbasierte Berechtigungen
- [x] Permission-Checker-Funktionen

#### 👑 Creator-Rechte
- [x] Admins ernennen/entziehen
- [x] Mitglieder hinzufügen/entfernen
- [x] Gruppe umbenennen
- [x] Beschreibung ändern
- [x] Gruppe löschen (Doppelbestätigung)
- [x] Kann nicht entfernt werden

#### ⚡ Admin-Rechte
- [x] Admins ernennen
- [x] Eigenen Admin-Status entfernen
- [x] Mitglieder hinzufügen/entfernen
- [x] Gruppe umbenennen/beschreiben

#### 👤 Member-Rechte
- [x] Gruppe verlassen
- [x] Nachrichten lesen/schreiben

#### 📱 UI Features
- [x] Members Modal mit Action-Buttons
- [x] "➕ Mitglied hinzufügen" Button
- [x] "⚙️ Gruppeneinstellungen" Button
- [x] Admin Toggle Button
- [x] Entfernen/Verlassen Buttons
- [x] Group Settings Modal (dynamisch)
- [x] Add Member Modal

---

## 🔥 Phase 6: Advanced Features (Next Up)

### Priorität 1: Push-Benachrichtigungen 🔔

#### Session 6.1: FCM Setup
- [ ] Firebase Cloud Messaging aktivieren
- [ ] Service Worker für Push erweitern
- [ ] Notification Permission Request
- [ ] Token-Verwaltung in Firestore
- [ ] Test-Benachrichtigung senden

#### Session 6.2: Message Notifications
- [ ] Benachrichtigung bei neuer DM
- [ ] Benachrichtigung bei neuer Gruppennachricht
- [ ] Benachrichtigung bei Erwähnung (@username)
- [ ] Badge-Counter auf App-Icon
- [ ] Sound-Benachrichtigungen (optional)

#### Session 6.3: Notification Settings
- [ ] Benachrichtigungen pro Chat ein/ausschalten
- [ ] "Stumm schalten" für X Stunden
- [ ] "Nicht stören" Modus
- [ ] Einstellungen in User-Profil

---

### Priorität 2: Medien-Upload 📎

#### Session 6.4: Firebase Storage Setup
- [ ] Firebase Storage aktivieren
- [ ] Storage Rules konfigurieren
- [ ] Upload-Funktion erstellen
- [ ] Progress Bar

#### Session 6.5: Bilder senden
- [ ] Bild-Upload Button
- [ ] Dateiauswahl (File Input)
- [ ] Vorschau vor Senden
- [ ] Upload zu Storage
- [ ] URL in Nachricht speichern
- [ ] Bildanzeige im Chat
- [ ] Thumbnail-Generierung
- [ ] Lightbox zum Vergrößern

#### Session 6.6: Dateien teilen
- [ ] Datei-Upload (PDF, DOCX, etc.)
- [ ] Icon nach Dateityp
- [ ] Download-Button
- [ ] Dateigröße-Limit (z.B. 10MB)
- [ ] Fortschrittsanzeige

---

### Priorität 3: Nachricht-Suche 🔍

#### Session 6.7: Suche innerhalb Chat
- [ ] Suchfeld im Chat-Header
- [ ] Volltextsuche durch Nachrichten
- [ ] Hervorhebung der Ergebnisse
- [ ] Navigation zwischen Treffern
- [ ] Filter nach Datum

#### Session 6.8: Globale Suche
- [ ] Suche über alle Chats
- [ ] Ergebnis-Liste mit Chat-Name
- [ ] Klick springt zur Nachricht
- [ ] Firestore Composite Index

---

### Priorität 4: Typing Indicator ✍️

#### Session 6.9: "... schreibt" Anzeige
- [ ] Firestore: `typing/{chatId}` Collection
- [ ] Beim Tippen: Timeout 3 Sekunden
- [ ] Anzeige "@username schreibt..."
- [ ] Echtzeit-Updates via Snapshot
- [ ] Cleanup bei Verlassen
- [ ] Für DMs und Gruppen

---

### Priorität 5: Lesebesttäigungen ✓✓

#### Session 6.10: Read Receipts
- [ ] Firestore: `readBy` Array in Nachrichten
- [ ] Beim Öffnen: Update readBy
- [ ] Doppelhaken-Icon wie WhatsApp
- [ ] "Gelesen von X Personen" (Gruppen)
- [ ] Einstellung: Lesebesttätigungen deaktivieren

---

### Priorität 6: Emoji-Reaktionen 😊

#### Session 6.11: Message Reactions
- [ ] Reaktions-Button bei Nachricht
- [ ] Emoji-Picker (z.B. emoji-picker-element)
- [ ] Firestore: `reactions/{messageId}`
- [ ] Anzeige unter Nachricht
- [ ] Counter pro Emoji
- [ ] Toggle eigene Reaktion
- [ ] Max. 5 verschiedene Emojis

---

## 🚀 Phase 7: Utility Bots (Future)

### Session 7.1: Bot Framework
- [ ] Command Parser (`/command`)
- [ ] Bot Registry
- [ ] Firebase Cloud Functions Setup
- [ ] Bot User Accounts

### Session 7.2: Reminder Bot ⏰
- [ ] `/remind [time] [message]`
- [ ] Time Parser ("in 10 min", "at 15:30")
- [ ] Scheduled Cloud Function
- [ ] Cancel Command

### Session 7.3: Poll Bot 📊
- [ ] `/poll [question] | [option1] | [option2]`
- [ ] Vote Buttons
- [ ] Live Vote Count
- [ ] Close Poll

### Session 7.4: Fun Bots 🎲
- [ ] `/roll [sides]` - Dice Roller
- [ ] `/coinflip` - Heads or Tails
- [ ] `/8ball` - Magic 8-ball

---

## 🧠 Phase 8: AI Integration (Future)

### Session 8.1: Perplexity API Setup
- [ ] API Key Setup
- [ ] Environment Variables
- [ ] Cloud Function Wrapper

### Session 8.2: Sonar Chat Bot 🤖
- [ ] `/ask [question]`
- [ ] Conversation Context
- [ ] Citations anzeigen

### Session 8.3: Summary Bot 📝
- [ ] `/summary [count]`
- [ ] Zusammenfassung der letzten N Nachrichten

### Session 8.4: Translate Bot 🌍
- [ ] `/translate [lang] [text]`
- [ ] Auto-Detect Source Language

---

## 📊 Progress Tracking

### Milestones

- [x] **Milestone 1**: Basic Messenger → Feb 13, 2026
- [x] **Milestone 2**: Direct Messages → Feb 13, 2026
- [x] **Milestone 3**: Gruppen-Features → Feb 17, 2026
- [x] **Milestone 4**: Modular Architecture → Feb 18, 2026
- [x] **Milestone 5**: Member Management → Feb 18, 2026
- [ ] **Milestone 6**: Advanced Features (Notifications, Media, etc.)
- [ ] **Milestone 7**: Utility Bots
- [ ] **Milestone 8**: AI Integration
- [ ] **Milestone 9**: v1.0 Production Release

### Time Estimates

| Phase | Estimated Time | Status |
|-------|----------------|--------|
| Phase 1-2 (Basic + DM) | ~5h | ✅ Done |
| Phase 3 (Groups) | ~4h | ✅ Done |
| Phase 4 (Modular) | ~2h | ✅ Done |
| Phase 5 (Permissions) | ~3h | ✅ Done |
| Phase 6 (Advanced) | ~12-15h | 🔥 Next |
| Phase 7 (Bots) | ~6-8h | ⏳ Planned |
| Phase 8 (AI) | ~4-5h | ⏳ Planned |
| **Total Remaining** | **~22-28h** | - |

---

## 🗄️ Current File Structure

```
PWA-Messenger/
├── index.html
├── styles.css
├── app.js              # Main entry point
├── modules/
│   ├── state.js        # Firebase & state
│   ├── ui.js           # UI helpers
│   ├── users.js        # User management
│   ├── auth.js         # Authentication
│   ├── groups.js       # Group features
│   ├── directMessages.js  # DMs
│   └── groupMembers.js    # Member management
├── manifest.json
├── sw.js
├── ROADMAP.md
├── CHANGELOG.md
└── .github/workflows/
```

---

## 📝 Firestore Structure

```
Firestore/
├── users/
│   └── {uid}/
│       ├── username
│       ├── email
│       └── createdAt
├── chats/  (DM Metadata)
│   └── {chatId}/  (uid1_uid2)
│       ├── participants: [uid1, uid2]
│       ├── lastMessage
│       ├── lastMessageTime
│       └── unreadCount: {uid1: 0, uid2: 3}
├── directMessages/
│   └── {chatId}/
│       └── messages/
│           └── {messageId}/
│               ├── text
│               ├── uid
│               ├── username
│               └── createdAt
├── groups/  (Group Metadata)
│   └── {groupId}/
│       ├── name
│       ├── description
│       ├── createdBy (Creator UID)
│       ├── members: [uid1, uid2, ...]
│       ├── admins: [uid1, ...]
│       ├── createdAt
│       ├── lastMessage
│       ├── lastMessageTime
│       └── unreadCount: {uid1: 2, uid2: 0, ...}
└── groupMessages/
    └── {groupId}/
        └── messages/
            └── {messageId}/
                ├── text
                ├── uid
                ├── username
                └── createdAt
```

---

## 📧 Contact & Resources

**Live App**: https://messenger.future-pulse.tech

**GitHub**: https://github.com/oliverlaudan-ops/PWA-Messenger

**Next Session**: Phase 6.1 - Push Notifications Setup

---

**Last Updated**: February 18, 2026, 09:26 CET

**Version**: 0.5.0

**Contributors**:
- Oliver Laudan (@oliverlaudan-ops) - Main Developer
- Perplexity AI - Development Assistant
