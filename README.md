# PWA Messenger

Ein moderner Progressive Web App Messenger mit Firebase Backend.

## Features

✅ **Phase 1 - Basic Setup**
- Firebase Authentication (Login/Register/Logout)
- Username System
- Global Chat

✅ **Phase 2 - Direktnachrichten**
- DM System mit Chat-Liste
- Echtzeit-Nachrichten
- Unread Counter mit rotem Badge
- User Search Modal

✅ **Phase 3 - Gruppen**
- Gruppe erstellen (Name + Beschreibung)
- Gruppenliste mit Unread Badge
- Gruppenchat in Echtzeit
- Mitgliederzahl anzeigen

## Setup

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

## Sicherheit

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

## Projekt-Struktur

```
PWA-Messenger/
├── index.html              # Haupt-HTML-Datei
├── styles.css              # Styling
├── firebase.js             # Firebase Integration & App Logic
├── firebase.config.js      # Firebase Config (nicht im Repo!)
├── firebase.config.example.js  # Beispiel-Config
├── firestore.rules         # Firestore Security Rules
├── manifest.json           # PWA Manifest
├── firebase.json           # Firebase Deployment Config
├── CHANGELOG.md            # Vollständige Feature-Dokumentation
└── README.md               # Diese Datei
```

## Dokumentation

- **[CHANGELOG.md](CHANGELOG.md)** - Vollständige Feature-Dokumentation
- **[ROADMAP.md](ROADMAP.md)** - Geplante Features
- **[firestore.rules](firestore.rules)** - Firestore Security Rules

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6 Modules)
- **Backend:** Firebase (Firestore + Authentication)
- **Styling:** Custom CSS mit Glasmorphism
- **PWA:** Service Worker + Manifest

## Nächste Features (TODOs)

- [ ] Mitglieder zu Gruppe hinzufügen
- [ ] Gruppe verlassen
- [ ] Gruppe bearbeiten/löschen (Admin only)
- [ ] Push Notifications
- [ ] Typing Indicators
- [ ] Dark Mode
- [ ] Offline Support (Service Worker)

## Lizenz

MIT

## Autor

**Oliver Laudan** ([@oliverlaudan-ops](https://github.com/oliverlaudan-ops))
