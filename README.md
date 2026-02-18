# PWA Messenger

Ein moderner Progressive Web App Messenger mit Firebase Backend und modularer Architektur.

🌐 **Live Demo**: https://messenger.future-pulse.tech

---

## ✅ Features

### Phase 1: Basic Setup
- ✅ Firebase Authentication (Login/Register/Logout)
- ✅ Username System (unique, 3-20 chars)
- ✅ Global Test Chat
- ✅ Echtzeit-Nachrichten

### Phase 2: Direktnachrichten
- ✅ 1-on-1 Chat System
- ✅ DM Chat-Liste mit Vorschau
- ✅ Unread Counter (roter Badge)
- ✅ User Search Modal
- ✅ Timestamps (formatiert)
- ✅ Sortierung nach Aktivität

### Phase 3: Gruppen
- ✅ Gruppen erstellen (Name + Beschreibung)
- ✅ Gruppenliste mit Unread Badge
- ✅ Gruppenchat in Echtzeit
- ✅ Mitgliederzahl anzeigen
- ✅ Gruppenmitglieder-Modal

### Phase 4: Modular Architecture
- ✅ Code-Refactoring (35KB → 7 Module)
- ✅ `modules/state.js` - Firebase & State
- ✅ `modules/ui.js` - UI Helpers
- ✅ `modules/users.js` - User Management
- ✅ `modules/auth.js` - Authentication
- ✅ `modules/groups.js` - Group Features
- ✅ `modules/directMessages.js` - DM Features
- ✅ `modules/groupMembers.js` - Member Management
- ✅ `app.js` - Main Entry Point

### Phase 5: Gruppenmitgliederverwaltung
- ✅ Permission-System (Creator/Admin/Member)
- ✅ **Creator** (👑): Volle Kontrolle + Gruppe löschen
- ✅ **Admin** (⚡): Verwaltung + Gruppe bearbeiten
- ✅ **Member** (👤): Grundrechte + Gruppe verlassen
- ✅ Mitglieder hinzufügen/entfernen
- ✅ Admins ernennen/entziehen
- ✅ Gruppe umbenennen/beschreiben
- ✅ Gruppe löschen (mit Doppelbestätigung)

---

## 🚀 Next Up (Phase 6)

### Priorität 1: Push-Benachrichtigungen 🔔
- [ ] Firebase Cloud Messaging Setup
- [ ] Benachrichtigung bei neuen Nachrichten
- [ ] Badge-Counter auf App-Icon
- [ ] Benachrichtigungseinstellungen

### Priorität 2: Medien-Upload 📎
- [ ] Bilder in Chats senden
- [ ] Firebase Storage Integration
- [ ] Dateien teilen (PDF, DOCX, etc.)
- [ ] Thumbnail-Vorschau

### Priorität 3: Nachricht-Suche 🔍
- [ ] Suche innerhalb Chat
- [ ] Globale Suche über alle Chats
- [ ] Filter nach Datum/Sender

### Priorität 4: Typing Indicator ✍️
- [ ] "@username schreibt..." Anzeige
- [ ] Echtzeit-Updates
- [ ] Timeout nach 3 Sekunden

### Priorität 5: Lesebesttäigungen ✓✓
- [ ] Doppelhaken wie WhatsApp
- [ ] "Gelesen von X Personen" (Gruppen)
- [ ] Optional deaktivierbar

### Priorität 6: Emoji-Reaktionen 😊
- [ ] Auf Nachrichten reagieren
- [ ] Emoji-Picker
- [ ] Counter anzeigen

---

## 🛠️ Setup

### 1. Repository klonen

```bash
git clone https://github.com/oliverlaudan-ops/PWA-Messenger.git
cd PWA-Messenger
```

### 2. Firebase Konfiguration einrichten

**WICHTIG:** Die Firebase-Konfiguration ist aus Sicherheitsgründen nicht im Repository enthalten.

1. Erstelle eine Kopie der Beispiel-Datei:
   ```bash
   cp firebase.config.example.js firebase.config.js
   ```

2. Öffne `firebase.config.js` und ersetze die Platzhalter mit deinen echten Firebase-Credentials:

   ```javascript
   export const firebaseConfig = {
     apiKey: "DEIN_API_KEY",
     authDomain: "DEIN_PROJECT_ID.firebaseapp.com",
     projectId: "DEIN_PROJECT_ID",
     storageBucket: "DEIN_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "DEINE_SENDER_ID",
     appId: "DEINE_APP_ID",
     measurementId: "DEINE_MEASUREMENT_ID"
   };
   ```

3. Wo findest du diese Werte?
   - Gehe zur [Firebase Console](https://console.firebase.google.com/)
   - Wähle dein Projekt aus
   - Klicke auf **Projekteinstellungen** (Zahnrad-Symbol)
   - Scrolle zu **Deine Apps** → **Web-App**
   - Kopiere die Config-Werte

### 3. Firebase Rules deployen

```bash
# Firebase CLI installieren (falls noch nicht vorhanden)
npm install -g firebase-tools

# Anmelden
firebase login

# Projekt initialisieren
firebase init firestore

# Rules deployen
firebase deploy --only firestore:rules
```

### 4. App starten

Da es sich um eine reine Frontend-App handelt, kannst du sie einfach mit einem lokalen Webserver starten:

```bash
# Option 1: Python SimpleHTTPServer
python -m http.server 8000

# Option 2: Node.js http-server
npx http-server -p 8000

# Option 3: VS Code Live Server Extension
# Rechtsklick auf index.html → "Open with Live Server"
```

Öffne dann [http://localhost:8000](http://localhost:8000) im Browser.

---

## 📁 Projekt-Struktur

```
PWA-Messenger/
├── index.html              # Haupt-HTML-Datei
├── styles.css              # Styling
├── app.js                  # Main Entry Point
├── modules/
│   ├── state.js            # Firebase & Shared State
│   ├── ui.js               # UI Helpers & Formatting
│   ├── users.js            # User Search & Caching
│   ├── auth.js             # Authentication
│   ├── groups.js           # Group Functionality
│   ├── directMessages.js   # DM Functionality
│   └── groupMembers.js     # Member Management
├── firebase.config.js      # Firebase Config (nicht im Repo!)
├── firebase.config.example.js  # Beispiel-Config
├── firestore.rules         # Firestore Security Rules
├── manifest.json           # PWA Manifest
├── sw.js                   # Service Worker
├── firebase.json           # Firebase Deployment Config
├── CHANGELOG.md            # Vollständige Feature-Dokumentation
├── ROADMAP.md              # Geplante Features & Milestones
└── README.md               # Diese Datei
```

---

## 🔒 Sicherheit

### Firebase API Key

⚠️ **Wichtig:** Die Datei `firebase.config.js` ist in `.gitignore` und wird **NICHT** ins Repository committed.

- Der Firebase Web API Key ist designed, um public zu sein
- Die echte Sicherheit kommt von den **Firestore Security Rules** (siehe `firestore.rules`)
- Trotzdem solltest du in Firebase folgende Schutzmaßnahmen aktivieren:

### Firebase Console - Empfohlene Einstellungen

1. **Authentication → Settings → Authorized domains**
   - Nur deine echte Domain hinzufügen
   - `localhost` nur in Development erlauben

2. **Firestore → Rules**
   - Rules sind bereits in `firestore.rules` definiert
   - Mit `firebase deploy --only firestore:rules` deployen

3. **Project Settings → General → App Check** (optional aber empfohlen)
   - App Check aktivieren für zusätzlichen Bot-Schutz

---

## 📊 Tech Stack

- **Frontend:** Vanilla JavaScript (ES6 Modules)
- **Backend:** Firebase (Firestore + Authentication)
- **Architecture:** Modular (7 separate modules)
- **Styling:** Custom CSS mit Glasmorphism
- **PWA:** Service Worker + Manifest
- **CI/CD:** GitHub Actions → Firebase Hosting

---

## 📚 Dokumentation

- **[CHANGELOG.md](CHANGELOG.md)** - Vollständige Feature-Dokumentation (Phasen 1-5)
- **[ROADMAP.md](ROADMAP.md)** - Geplante Features & Milestones (Phase 6+)
- **[firestore.rules](firestore.rules)** - Firestore Security Rules

---

## 👥 Contributors

**Oliver Laudan** ([@oliverlaudan-ops](https://github.com/oliverlaudan-ops)) - Main Developer

**Perplexity AI** - Development Assistant

---

## 📜 Lizenz

MIT

---

**Version:** 0.5.0

**Last Updated:** February 18, 2026
