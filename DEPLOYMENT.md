# 🚀 Deployment Guide - PWA Messenger

## 🔄 Automatisches Deployment (Aktuell aktiv)

### GitHub Actions Workflow

Bei jedem Push auf `main` Branch wird automatisch deployed:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout Code
      - Deploy to GitHub Pages
```

**Status prüfen:** https://github.com/oliverlaudan-ops/PWA-Messenger/actions

---

## 🎯 Deployment-Ziele

### Frontend (GitHub Pages)
- **URL:** https://messenger.future-pulse.tech
- **Alternativ:** https://oliverlaudan-ops.github.io/PWA-Messenger/
- **Branch:** `main`
- **Deployment:** Automatisch via GitHub Actions

### Cloud Functions
- **Region:** us-central1
- **Functions:**
  - `onNewGroupMessage`
  - `onNewDirectMessage`
  - `cleanupOldTokens`
- **Deployment:** Manuell via Firebase CLI

---

## 🛠️ Manuelles Deployment

### Frontend deployen

```bash
# Nichts zu tun! 
# GitHub Actions deployed automatisch bei push
git add .
git commit -m "Update message"
git push origin main

# Warte 1-2 Minuten
# Dann: https://messenger.future-pulse.tech refreshen
```

### Cloud Functions deployen

```bash
# 1. In functions Ordner wechseln
cd functions

# 2. Dependencies installieren (falls nötig)
npm install

# 3. Firebase Login (einmalig)
firebase login

# 4. Functions deployen
firebase deploy --only functions

# 5. Deployment verifizieren
# https://console.firebase.google.com/project/pwa-messenger-oliver/functions
```

**Einzelne Function deployen:**
```bash
firebase deploy --only functions:onNewGroupMessage
```

---

## 🔍 Deployment Verifikation

### Frontend Check

1. **Öffne:** https://messenger.future-pulse.tech
2. **Hard Reload:** Ctrl+Shift+R (oder Cmd+Shift+R)
3. **F12 → Console:**
   - Keine Errors?
   - Firebase initialisiert?
   - Service Worker registriert?

4. **F12 → Application → Service Workers:**
   - `firebase-messaging-sw.js` aktiv?
   - `sw.js` aktiv?

5. **Funktionstest:**
   - Login funktioniert?
   - Nachrichten werden angezeigt?
   - Neue Nachricht senden funktioniert?

### Cloud Functions Check

1. **Öffne:** https://console.firebase.google.com/project/pwa-messenger-oliver/functions

2. **Prüfe Status:** Alle Functions sollten "deployed" sein

3. **Test durchführen:**
   - Sende eine Testnachricht
   - Prüfe Logs: https://console.firebase.google.com/project/pwa-messenger-oliver/functions/logs
   - Sollte sehen: "✅ Successfully sent X notifications"

4. **Error Monitoring:**
   - Prüfe auf Errors in Logs
   - Achte auf Rate Limits

---

## 🔧 Deployment Configuration

### GitHub Pages Settings

**Repository Settings:**
- Settings → Pages
- Source: GitHub Actions
- Custom Domain: messenger.future-pulse.tech
- Enforce HTTPS: ✅ Aktiviert

### Firebase Project Settings

**Project ID:** `pwa-messenger-oliver`

**Aktivierte Services:**
- ✅ Authentication (Email/Password)
- ✅ Cloud Firestore
- ✅ Cloud Functions
- ✅ Cloud Messaging
- ✅ Hosting (optional, nicht verwendet)

---

## ⚡ Performance Optimization

### Caching Strategy

**Service Worker (`sw.js`):**
- Cache-First für App Shell
- Network-First für Firebase Requests
- Cached Assets:
  - HTML, CSS, JS Files
  - Icons
  - Manifest

### CDN & Caching

- Firebase SDK von Google CDN
- GitHub Pages CDN für statische Assets
- Service Worker cached App Shell

---

## 🔒 Sicherheit

### HTTPS

- ✅ Erzwungen via GitHub Pages
- ✅ Custom Domain mit SSL
- ✅ Service Worker benötigt HTTPS

### API Keys

**Öffentliche Keys (im Client-Code):**
- Firebase Web API Key
- VAPID Key für FCM
- **Sicher:** Durch Firestore Rules geschützt

**Private Keys (nicht im Code):**
- Firebase Admin SDK Service Account
- **Nur** in Cloud Functions verwendet

---

## 🐛 Troubleshooting Deployment

### GitHub Actions Failed

**Problem:** Deployment schlägt fehl

**Lösung:**
1. Öffne: https://github.com/oliverlaudan-ops/PWA-Messenger/actions
2. Klicke auf failed Workflow
3. Prüfe Error Message
4. Häufige Ursachen:
   - Syntax Error in HTML/CSS/JS
   - Ungültige Datei-Referenzen
   - GitHub Pages Settings falsch

### Functions Deployment Failed

**Problem:** `firebase deploy --only functions` schlägt fehl

**Lösungen:**

1. **Node Version prüfen:**
   ```bash
   node --version  # Sollte v18+ sein
   ```

2. **Dependencies neu installieren:**
   ```bash
   cd functions
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Firebase Project prüfen:**
   ```bash
   firebase use --add
   # Wähle: pwa-messenger-oliver
   ```

4. **IAM Permissions prüfen:**
   - Google Cloud Console
   - IAM & Admin
   - Service Account muss "Cloud Functions Developer" Rolle haben

### Service Worker nicht aktiv

**Problem:** Service Worker registriert nicht

**Lösungen:**

1. **HTTPS prüfen:**
   - Service Worker funktioniert nur mit HTTPS
   - Ausnahme: localhost

2. **Cache leeren:**
   - F12 → Application → Clear Storage
   - "Clear site data" klicken
   - Seite neu laden

3. **Service Worker neu registrieren:**
   ```javascript
   // In Browser Console:
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister())
   })
   ```

---

## 📊 Monitoring

### Firebase Console

**Usage Monitoring:**
- Firestore: https://console.firebase.google.com/project/pwa-messenger-oliver/firestore/usage
- Functions: https://console.firebase.google.com/project/pwa-messenger-oliver/functions/usage
- Auth: https://console.firebase.google.com/project/pwa-messenger-oliver/authentication/users

**Logs:**
- Functions Logs: https://console.firebase.google.com/project/pwa-messenger-oliver/functions/logs
- Crashlytics: (optional, nicht aktiviert)

### Google Cloud Console

**Metrics:**
- Cloud Functions: https://console.cloud.google.com/functions/list?project=pwa-messenger-oliver
- API Usage: https://console.cloud.google.com/apis/dashboard?project=pwa-messenger-oliver

---

## 💰 Kostenübersicht

### Firebase Spark Plan (Free Tier)

**Inklusive:**
- Firestore: 50k reads/day, 20k writes/day
- Functions: 125k invocations/month, 40k GB-seconds
- Authentication: Unlimited users
- Hosting: 10 GB storage, 360 MB/day bandwidth

**Aktueller Verbrauch prüfen:**
https://console.firebase.google.com/project/pwa-messenger-oliver/usage

### Upgrade zu Blaze Plan

**Nötig wenn:**
- > 50k Firestore reads/day
- > 125k Function invocations/month
- Mehr als 10 GB Hosting Storage

**Kosten:** Pay-as-you-go
- Firestore: $0.06/100k reads
- Functions: $0.40/million invocations

---

## 🔄 Rollback

### Frontend Rollback

**GitHub:**
```bash
# 1. Finde letzten funktionierenden Commit
git log --oneline

# 2. Revert zu diesem Commit
git revert <commit-hash>

# 3. Push
git push origin main

# GitHub Actions deployed automatisch alte Version
```

### Functions Rollback

**Firebase CLI:**
```bash
# Zeige Deployment History
firebase functions:log

# Leider kein direkter Rollback möglich
# Lösung: Alten Code aus Git holen und neu deployen
git checkout <commit-hash> functions/
cd functions
firebase deploy --only functions
```

---

## 📝 Changelog

### Version 1.0.0 (Feb 2026)

**Features:**
- ✅ Initial Release
- ✅ Push Notifications
- ✅ PWA Support
- ✅ Group & Direct Messages
- ✅ Real-time Updates

**Deployment:**
- ✅ GitHub Actions CI/CD
- ✅ Custom Domain
- ✅ Cloud Functions deployed

---

**Letztes Update:** Februar 2026  
**Maintainer:** Oliver Laudan
