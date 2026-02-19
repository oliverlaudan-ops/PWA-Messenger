# 📚 PWA Messenger - Dokumentations-Index

Willkommen zur vollständigen Dokumentation des PWA Messenger Projekts!

---

## 📌 Schnellstart

**Neuer Entwickler?** Starte hier:

1. 📖 **[README.md](../README.md)** - Projektübersicht & Setup Guide
2. 🏛️ **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System-Architektur verstehen
3. 🚀 **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Deployment durchführen
4. 🔌 **[API.md](API.md)** - Cloud Functions API Referenz

---

## 📚 Dokumentations-Übersicht

### 📖 [README.md](../README.md)
**Haupt-Dokumentation**

**Inhalt:**
- ✅ Feature-Übersicht
- 🏗️ Technologie-Stack
- 📁 Projekt-Struktur
- 🔧 Setup & Installation
- 🚀 Deployment
- 🔔 Push Notifications Details
- 📊 Datenbank-Schema
- 🔐 Sicherheit
- 🧪 Testing
- 🐛 Troubleshooting
- 🚀 Feature Roadmap

**Für:** Alle (Start hier!)

---

### 🏛️ [ARCHITECTURE.md](../ARCHITECTURE.md)
**System-Architektur**

**Inhalt:**
- 📊 System-Übersicht Diagramm
- 📦 Modul-Architektur
- 🔄 Datenfluss-Diagramme
- 🛠️ Service Worker Architektur
- 💾 Datenbank-Design
- 🔐 Security Architecture
- ⚡ Performance Optimierungen
- 📊 Skalierbarkeit
- 🧰 Design Patterns

**Für:** Entwickler, Architekten

---

### 🚀 [DEPLOYMENT.md](../DEPLOYMENT.md)
**Deployment Guide**

**Inhalt:**
- 🔄 GitHub Actions Workflow
- 🎯 Deployment-Ziele (Frontend & Backend)
- 🛠️ Manuelles Deployment
- 🔍 Deployment Verifikation
- 🔧 Configuration
- ⚡ Performance Optimization
- 🔒 Sicherheit
- 🐛 Troubleshooting
- 📊 Monitoring
- 💰 Kostenübersicht
- 🔄 Rollback

**Für:** DevOps, Deployment Engineers

---

### 🔌 [docs/API.md](API.md)
**Cloud Functions API**

**Inhalt:**
- 📌 API Übersicht
- 🔔 Notification Functions
  - onNewGroupMessage
  - onNewDirectMessage
  - cleanupOldTokens
- 🔧 Deployment
- 📊 Monitoring & Logs
- 🐛 Error Handling
- 🔒 Security & IAM
- 💰 Kosten-Kalkulation
- 🧰 Best Practices

**Für:** Backend-Entwickler, API-Integration

---

## 🔍 Dokumentation nach Thema

### 👶 Anfänger / Erste Schritte

1. **Setup:**
   - [README.md - Setup & Installation](../README.md#-setup--installation)
   - [README.md - Lokale Entwicklung](../README.md#lokale-entwicklung)

2. **Verstehen:**
   - [ARCHITECTURE.md - System-Übersicht](../ARCHITECTURE.md#-system-übersicht)
   - [README.md - Feature-Übersicht](../README.md#-features)

3. **Testen:**
   - [README.md - Testing](../README.md#-testing)

### 👨‍💻 Entwickler / Code

1. **Architektur:**
   - [ARCHITECTURE.md - Modul-Architektur](../ARCHITECTURE.md#-modul-architektur)
   - [ARCHITECTURE.md - Datenfluss](../ARCHITECTURE.md#-datenfluss)

2. **Datenbank:**
   - [ARCHITECTURE.md - Datenbank-Design](../ARCHITECTURE.md#-datenbank-design)
   - [README.md - Datenbank-Schema](../README.md#-datenbank-schema)

3. **API:**
   - [API.md - Cloud Functions](API.md)
   - [API.md - FCM Payloads](API.md#output-fcm-payload)

### 🚀 DevOps / Deployment

1. **CI/CD:**
   - [DEPLOYMENT.md - GitHub Actions](../DEPLOYMENT.md#-automatisches-deployment-aktuell-aktiv)
   - [DEPLOYMENT.md - Deployment Config](../DEPLOYMENT.md#-deployment-configuration)

2. **Monitoring:**
   - [DEPLOYMENT.md - Monitoring](../DEPLOYMENT.md#-monitoring)
   - [API.md - Logs & Metrics](API.md#-monitoring)

3. **Troubleshooting:**
   - [DEPLOYMENT.md - Troubleshooting](../DEPLOYMENT.md#-troubleshooting-deployment)
   - [README.md - Troubleshooting](../README.md#-troubleshooting)

### 🔒 Security / Admin

1. **Sicherheit:**
   - [README.md - Sicherheit](../README.md#-sicherheit)
   - [ARCHITECTURE.md - Security Architecture](../ARCHITECTURE.md#-security-architecture)

2. **Permissions:**
   - [API.md - IAM Permissions](API.md#iam-permissions)
   - [README.md - Firestore Rules](../README.md#5-firestore-security-rules)

3. **Kosten:**
   - [DEPLOYMENT.md - Kostenübersicht](../DEPLOYMENT.md#-kostenübersicht)
   - [API.md - Kosten](API.md#-kosten)

---

## 📝 Häufige Aufgaben

### ❓ "Wie mache ich...?"

#### Neue Feature hinzufügen
1. [ARCHITECTURE.md - Modul-Architektur](../ARCHITECTURE.md#-modul-architektur) verstehen
2. Neues Modul in `modules/` erstellen
3. In `app.js` importieren
4. [README.md - Testing](../README.md#-testing) durchführen
5. [DEPLOYMENT.md](../DEPLOYMENT.md) befolgen

#### Push Notifications debuggen
1. [README.md - Troubleshooting](../README.md#push-notifications-funktionieren-nicht) prüfen
2. [API.md - Error Handling](API.md#-error-handling) konsultieren
3. [DEPLOYMENT.md - Monitoring](../DEPLOYMENT.md#firebase-console) Logs prüfen

#### Deployment durchführen
1. [DEPLOYMENT.md - Manuelles Deployment](../DEPLOYMENT.md#-manuelles-deployment)
2. [DEPLOYMENT.md - Verifikation](../DEPLOYMENT.md#-deployment-verifikation)
3. [DEPLOYMENT.md - Monitoring](../DEPLOYMENT.md#-monitoring)

#### Datenbank-Schema ändern
1. [ARCHITECTURE.md - Datenbank-Design](../ARCHITECTURE.md#-datenbank-design) prüfen
2. [README.md - Firestore Rules](../README.md#5-firestore-security-rules) anpassen
3. Migration planen
4. Backup erstellen!

#### Performance optimieren
1. [ARCHITECTURE.md - Performance Optimierungen](../ARCHITECTURE.md#-performance-optimierungen)
2. [DEPLOYMENT.md - Performance](../DEPLOYMENT.md#-performance-optimization)
3. [API.md - Best Practices](API.md#-best-practices)

---

## 🔗 Externe Ressourcen

### Firebase Dokumentation
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

### Web Standards
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [PWA](https://web.dev/progressive-web-apps/)

### Tools
- [Firebase Console](https://console.firebase.google.com/project/pwa-messenger-oliver)
- [Google Cloud Console](https://console.cloud.google.com/)
- [GitHub Repository](https://github.com/oliverlaudan-ops/PWA-Messenger)

---

## 💬 Support

### Probleme melden
- **GitHub Issues:** [Issues erstellen](https://github.com/oliverlaudan-ops/PWA-Messenger/issues)
- **Email:** oliver.laudan@gmail.com

### Beitragen
- Fork das Repository
- Erstelle Feature Branch
- Committe Changes
- Erstelle Pull Request
- Folge Coding Standards in [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## 🔄 Dokumentation aktualisieren

### Wann aktualisieren?
- ✅ Nach jedem Major Feature
- ✅ Bei Architektur-Änderungen
- ✅ Bei API-Änderungen
- ✅ Bei Breaking Changes

### Wie aktualisieren?
1. Betroffene `.md` Dateien editieren
2. Versionsnummer erhöhen
3. "Letztes Update" Datum aktualisieren
4. Commit mit aussagekräftiger Message

---

**Dokumentation Version:** 1.0.0  
**Letztes Update:** Februar 2026  
**Status:** ✅ Vollständig & Aktuell
