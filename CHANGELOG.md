# Changelog - PWA Messenger

Alle wichtigen Änderungen am PWA Messenger werden hier dokumentiert.

---

## Phase 5: Gruppenmitgliederverwaltung ✅ (Abgeschlossen - Feb 18, 2026)

### 🆕 Neue Features

#### 1. Vollständiges Permission-System
- **3 Rollen mit unterschiedlichen Rechten**:
  - 👑 **Creator**: Volle Kontrolle + Gruppe löschen
  - ⚡ **Admin**: Verwaltung + Gruppe bearbeiten
  - 👤 **Member**: Grundrechte + Gruppe verlassen

#### 2. Creator-Rechte (👑)
- Admins ernennen/Admin-Status entziehen
- Mitglieder hinzufügen/entfernen
- Gruppe umbenennen
- Gruppenbeschreibung ändern
- Gruppe löschen (mit Doppelbestätigung)
- Kann nicht aus Gruppe entfernt werden

#### 3. Admin-Rechte (⚡)
- Admins ernennen
- Eigenen Admin-Status entfernen
- Mitglieder hinzufügen/entfernen
- Gruppe umbenennen
- Gruppenbeschreibung ändern

#### 4. Member-Rechte (👤)
- Gruppe verlassen
- Nachrichten lesen/schreiben

#### 5. UI Features
- **Members Modal erweitert**:
  - "➕ Mitglied hinzufügen" Button (Admins+)
  - "⚙️ Gruppeneinstellungen" Button (Admins+)
  - 👑 Creator Badge
  - ⚡ Admin Badge
  - Action-Buttons pro Mitglied (rollenbasiert)
  - "🗑️ Entfernen" Button für andere Mitglieder
  - "🚪 Verlassen" Button für sich selbst
  - Admin Toggle Button

- **Group Settings Modal** (neu):
  - Gruppenname bearbeiten
  - Beschreibung bearbeiten
  - "🗑️ Gruppe löschen" Button (nur Creator)
  - Dynamisch erstellt (kein HTML-Template)

- **Add Member Modal**:
  - Wiederverwendet User-Search Modal
  - Zeigt nur User die noch nicht Mitglied sind
  - Direktes Hinzufügen per Klick

### 🔧 Technische Details

#### Neues Modul: `modules/groupMembers.js`
- **Permission-Checker**:
  - `isCreator(groupData, userId)`
  - `isAdmin(groupData, userId)`
  - `canManageMembers(groupData, userId)`
  - `canManageAdmins(groupData, userId)`
  - `canEditGroup(groupData, userId)`
  - `canDeleteGroup(groupData, userId)`

- **Member Management**:
  - `showGroupMembers()` - Erweiterte Mitgliederliste mit Actions
  - `addMemberToGroup(groupId, userId, username)`
  - `removeMember(groupId, userId, username)`
  - `leaveGroup(groupId)`
  - `makeAdmin(groupId, userId, username)`
  - `removeAdmin(groupId, userId, username)`

- **Group Settings**:
  - `showGroupSettings(groupId, groupData)`
  - `updateGroupSettings(groupId)`
  - `deleteGroup(groupId)` - Mit doppelter Bestätigung

#### Firestore Updates
- `arrayUnion()` / `arrayRemove()` für members/admins Arrays
- `updateDoc()` für Gruppen-Metadaten
- `deleteDoc()` für Gruppen-Löschung
- Unread Counter wird automatisch für neue Members initialisiert

---

## Phase 4: Modulare Architektur ✅ (Abgeschlossen - Feb 18, 2026)

### ♻️ Refactoring: Modularisierung

#### Problem
- `firebase.js` war 35KB groß und unübersichtlich
- Alle Funktionen in einer Datei
- Schwer zu warten und zu erweitern

#### Lösung: Modular Architecture
```
modules/
├── state.js          (~2KB)  - Firebase init & shared state
├── ui.js             (~1.5KB) - UI helpers & formatting  
├── users.js          (~3KB)  - User search & caching
├── auth.js           (~3.5KB) - Authentication
├── groups.js         (~11KB) - Group functionality
├── directMessages.js (~10KB) - DM functionality
└── groupMembers.js   (~15KB) - Member management

app.js                (~2KB) - Main entry point
```

#### Module Details

**`state.js`**
- Firebase Konfiguration und Initialisierung
- Export von `auth`, `db`
- Shared State (currentUserData, subscriptions, userCache)
- State Setter-Funktionen
- `clearState()` für Logout

**`ui.js`**
- `formatTimestamp()` - Zeitstempel formatieren
- `showScreen()` - Screen Management
- `showError()` - Error Messages
- `switchTab()` - Tab Navigation

**`users.js`**
- `loadUserData()` - Mit Caching
- `loadAllUsers()` - Alle User laden
- `renderUserList()` - User-Liste rendern
- `showUserSearch()` - User-Such-Modal
- `filterUsers()` - Suchfilter

**`auth.js`**
- `signup()` - Registrierung
- `login()` - Login
- `logout()` - Logout mit State-Cleanup
- `setUsername()` - Username Setup
- `initAuthListener()` - Auth State Observer

**`groups.js`**
- Alle Gruppen-Funktionen aus firebase.js
- Create, List, Open, Close
- Messages laden und senden
- Metadata Updates
- Unread Counter

**`directMessages.js`**
- Alle DM-Funktionen aus firebase.js
- Chat List, Open, Close
- Messages laden und senden
- Chat Metadata
- Unread Counter

**`groupMembers.js`** (neu)
- Member Management (siehe Phase 5)
- Permission System
- Group Settings

**`app.js`**
- Haupt-Entry-Point
- Importiert alle Module
- Exposed Funktionen für `window` (für onclick-Handler)
- Event Listeners für Cross-Module Communication
- Initialisiert Auth Listener

### ✅ Vorteile

1. **Übersichtlich**: Jede Datei hat klare Verantwortung
2. **Wartbar**: Bugs leichter zu finden und zu fixen
3. **Erweiterbar**: Neue Features einfach als Modul hinzufügen
4. **Wiederverwendbar**: Module können importiert werden
5. **Testbar**: Jedes Modul kann einzeln getestet werden
6. **Kleiner**: Einzelne Dateien sind viel kleiner

### 🗑️ Cleanup
- `firebase.js` archiviert als `firebase.js.old`
- `firebase-members.js` gelöscht (durch groupMembers.js ersetzt)
- `firebase-patch-groupid.js` gelöscht (nicht mehr nötig)
- `firebase-patch.js` gelöscht
- `firebase-globals.js` gelöscht

---

## Phase 3: Gruppen-Features ✅ (Abgeschlossen)

### 🆕 Neue Features

#### 1. Gruppen erstellen
- **Modal zum Erstellen neuer Gruppen**
  - Gruppenname (Pflichtfeld, 3-50 Zeichen)
  - Beschreibung (Optional, max. 200 Zeichen)
  - Creator wird automatisch Admin und Mitglied
- **Button "+ Neue Gruppe"** im Groups-Tab
- **Validierung**: Name-Länge, Pflichtfelder

#### 2. Gruppenliste
- **Liste aller Gruppen** in denen der User Mitglied ist
- **Features**:
  - Letzte Nachricht Vorschau (max. 50 Zeichen)
  - Zeitstempel (heute/gestern/volle Datum)
  - Mitgliederzahl
  - Sortierung nach letzter Aktivität
  - **Unread Badge** (roter Kreis mit Anzahl)
- **Empty State** wenn keine Gruppen vorhanden

#### 3. Gruppenchat
- **Echtzeit-Gruppennachrichten**
  - Senden und Empfangen in real-time
  - Timestamps bei jeder Nachricht
  - Auto-Scroll zu neuesten Nachrichten
  - Limit: 50 neueste Nachrichten (DESC Order + Reverse)
- **Group Header**:
  - Gruppenname mit 👥 Icon
  - Mitgliederzahl
  - Zurück-Button zur Gruppenliste
  - "👥 Mitglieder" Button
- **Input** mit Enter-Support

#### 4. Gruppenmitglieder anzeigen
- **Modal mit Mitgliederliste**
- **Badges**: 👑 Creator, ⚡ Admin
- Anzeige von Username und E-Mail
- Mitgliederzahl im Header

#### 5. Unread Counter für Gruppen
- **Roter Badge** in Gruppenliste mit Anzahl ungelesener Nachrichten
- **Badge verschwindet** beim Öffnen der Gruppe
- **Counter wird aktualisiert** in Echtzeit
- **Firestore Struktur**:
  ```
  groups/{groupId}/
    - unreadCount: { userId1: 3, userId2: 0, userId3: 5 }
  ```
- **Logik**:
  - Sender's count = 0 (immer)
  - Alle anderen Members: +1 pro Nachricht
  - Reset beim Öffnen der Gruppe

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

#### 3. User Search Modal
- **Modal zum Starten neuer Chats**
- **Suche** nach Username oder E-Mail
- **Filterfunktion** in Echtzeit
- Liste aller verfügbaren User (außer sich selbst)

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

#### 4. UI/UX
- **Responsive Design** (Mobile-First)
- **Modern Design** mit Gradients und Glasmorphism
- **Loading States** (Spinner während Daten laden)
- **Error Messages** mit Auto-Hide (5 Sekunden)

---

## 🗄️ Firestore Struktur

```
users/
  {uid}/
    - username: string
    - email: string
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

groups/ (Group Metadata)
  {groupId}/
    - name: string
    - description: string
    - createdBy: userId (Creator)
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

---

## 📊 Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Backend**: Firebase (Firestore + Auth)
- **CSS**: Custom CSS mit CSS Variables
- **PWA**: Service Worker + Manifest
- **Architecture**: Modular (siehe Phase 4)

---

## 👥 Contributors

- **Oliver Laudan** (@oliverlaudan-ops) - Main Developer
- **Perplexity AI** - Development Assistant
