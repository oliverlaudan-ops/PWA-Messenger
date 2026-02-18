# Phase 6: Push-Benachrichtigungen Setup Guide

## ✅ Was wurde implementiert

### 1. Neues Modul: `modules/notifications.js`
- Firebase Cloud Messaging (FCM) Integration
- Notification Permission Request
- FCM Token Management
- Benachrichtigungs-Einstellungen (Settings)
- Chat Mute/Unmute Funktionalität
- "Nicht stören" Modus
- App Badge Counter
- Foreground Notification Handling

### 2. Service Worker: `sw.js`
- PWA Offline-Caching
- Background Push Notification Handling
- Notification Click Events mit Deep Linking
- Badge Update Handling

### 3. Firebase Cloud Functions: `functions/index.js`
- Push Notifications bei neuen Gruppennachrichten
- Push Notifications bei neuen Direktnachrichten
- Automatisches Token Cleanup (30 Tage)
- Respektiert User Notification Settings

### 4. Integration in App
- `app.js` erweitert mit Notification Funktionen
- Service Worker Message Handling
- Deep Linking bei Notification Clicks
- URL Parameter Parsing für Chat-Navigation

---

## 🛠️ Setup Schritte

### Schritt 1: VAPID Key generieren

1. Gehe zur [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt: `pwa-messenger-oliver`
3. Gehe zu **Project Settings** (Zahnrad-Icon) → **Cloud Messaging**
4. Scrolle zu **Web Push certificates**
5. Klicke auf **Generate key pair**
6. Kopiere den generierten Key

7. **Ersetze den Platzhalter** in `modules/notifications.js`:
```javascript
const VAPID_KEY = 'DEIN_VAPID_KEY_HIER'; // ← Hier einfügen!
```

### Schritt 2: Firebase Cloud Functions deployen

```bash
# 1. Firebase CLI installieren (falls noch nicht vorhanden)
npm install -g firebase-tools

# 2. In Firebase einloggen
firebase login

# 3. Functions Abhängigkeiten installieren
cd functions
npm install

# 4. Zurück ins Root-Verzeichnis
cd ..

# 5. Functions deployen
firebase deploy --only functions
```

**Wichtig:** Firebase Functions erfordern einen Blaze Plan (Pay-as-you-go). Der Spark Plan (Free) unterstützt keine Cloud Functions mit externen API-Calls.

### Schritt 3: Firestore Security Rules aktualisieren

Ergänze in `firestore.rules`:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
  
  // FCM Tokens und Notification Settings
  allow update: if request.auth.uid == userId && 
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(
      ['fcmTokens', 'notificationSettings', 'notificationsEnabled']
    );
}
```

Dann deployen:
```bash
firebase deploy --only firestore:rules
```

### Schritt 4: Service Worker registrieren

Der Service Worker wird automatisch in `modules/notifications.js` registriert, sobald der User Benachrichtigungen aktiviert.

**Teste die Registrierung:**
1. Öffne die App
2. Öffne DevTools → Application → Service Workers
3. Du solltest `sw.js` als aktiv sehen

### Schritt 5: Notification Permission UI hinzufügen

Ergänze in `index.html` im Chat Screen:

```html
<!-- Notification Toggle Button in Header -->
<div class="chat-header">
  <div class="user-info">
    <span id="userInfo"></span>
    <button id="notificationToggle" onclick="requestNotifications()" 
            style="margin-left: 10px; background: none; border: none; 
                   font-size: 20px; cursor: pointer;" 
            title="Benachrichtigungen aktivieren">
      🔔
    </button>
    <button onclick="showNotificationSettings()" 
            style="margin-left: 5px; background: none; border: none; 
                   font-size: 18px; cursor: pointer;" 
            title="Benachrichtigungseinstellungen">
      ⚙️
    </button>
  </div>
  <button onclick="logout()" class="logout-btn">Logout</button>
</div>

<!-- Notification Settings Modal -->
<div id="notificationSettingsModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h2>🔔 Benachrichtigungen</h2>
      <button onclick="closeNotificationSettings()" class="close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="settings-group">
        <label>
          <input type="checkbox" id="notificationsEnabled" 
                 onchange="toggleNotifications(this.checked)" checked>
          Benachrichtigungen aktiviert
        </label>
      </div>
      
      <div class="settings-group">
        <label>
          <input type="checkbox" id="notificationSound" 
                 onchange="toggleNotificationSound(this.checked)" checked>
          Sound aktiviert
        </label>
      </div>
      
      <div class="settings-group">
        <h3>Nicht stören</h3>
        <p id="dndStatus">Inaktiv</p>
        <button onclick="enableDoNotDisturb(3600000)" class="btn">1 Stunde</button>
        <button onclick="enableDoNotDisturb(28800000)" class="btn">8 Stunden</button>
        <button onclick="disableDoNotDisturb()" class="btn">Deaktivieren</button>
      </div>
    </div>
  </div>
</div>
```

### Schritt 6: Chat Mute/Unmute Button hinzufügen

In `modules/groups.js` oder `modules/directMessages.js` im Chat Header:

```javascript
// Chat Mute Button
const muteBtn = document.createElement('button');
muteBtn.textContent = isChatMuted(chatId) ? '🔊' : '🔇';
muteBtn.onclick = async () => {
  if (isChatMuted(chatId)) {
    await unmuteChat(chatId);
    muteBtn.textContent = '🔇';
  } else {
    // Mute for 24 hours
    await muteChat(chatId, 24 * 60 * 60 * 1000);
    muteBtn.textContent = '🔊';
  }
};
```

### Schritt 7: Auth Modul erweitern

In `modules/auth.js` nach erfolgreichem Login ein Event feuern:

```javascript
// In initAuthListener nach erfolgreichem Login
window.dispatchEvent(new CustomEvent('userLoggedIn'));
```

---

## 🧪 Testen der Push-Benachrichtigungen

### 1. Lokales Testen (Foreground)

1. App im Browser öffnen
2. Einloggen
3. Auf Notification Bell klicken → Permission erteilen
4. DevTools Console öffnen
5. FCM Token sollte angezeigt werden
6. Neue Nachricht in anderem Tab/Browser senden
7. Notification sollte erscheinen

### 2. Background Testen

1. App in Tab öffnen und einloggen
2. Notifications aktivieren
3. **Tab in Hintergrund legen** (nicht schließen!)
4. Nachricht von anderem Gerät senden
5. System Notification sollte erscheinen
6. Auf Notification klicken → App sollte öffnen und zum Chat navigieren

### 3. FCM Test mit Firebase Console

1. Firebase Console → **Cloud Messaging**
2. **Send test message**
3. FCM Token aus Console kopieren und einfügen
4. Nachricht senden
5. Notification sollte ankommen

### 4. Mobile PWA Testen

1. App auf Smartphone öffnen (Chrome/Safari)
2. "Add to Home Screen"
3. App aus Home Screen öffnen
4. Notifications aktivieren
5. App schließen/in Hintergrund
6. Nachricht senden → Push Notification erhalten
7. Auf Notification tippen → App öffnet direkt zum Chat

---

## 🐛 Troubleshooting

### Problem: Keine Permissions-Anfrage
```javascript
// In Browser Console prüfen:
Notification.permission
// Sollte 'default', 'granted' oder 'denied' sein

// Falls 'denied', muss User in Browser Settings zurücksetzen:
// Chrome: Settings → Privacy → Site Settings → Notifications
```

### Problem: FCM Token wird nicht generiert
```javascript
// Prüfen:
1. VAPID_KEY korrekt eingetragen?
2. Service Worker registriert? (DevTools → Application)
3. Firebase Messaging im Firebase Config aktiv?
4. HTTPS oder localhost? (FCM erfordert HTTPS!)
```

### Problem: Cloud Functions senden keine Notifications
```bash
# Functions Logs prüfen:
firebase functions:log

# Häufige Fehler:
# - Blaze Plan nicht aktiviert
# - FCM Token nicht in Firestore gespeichert
# - Notification Settings blockieren Notifications
```

### Problem: Notification Click öffnet Chat nicht
```javascript
// Service Worker Message Listener prüfen:
navigator.serviceWorker.addEventListener('message', console.log);

// URL Parameter beim Öffnen checken:
console.log(window.location.search);
```

---

## 📊 Feature Übersicht

### ✅ Implementiert
- [x] FCM Token Management
- [x] Notification Permission Request UI
- [x] Foreground Notifications
- [x] Background Notifications
- [x] Notification Click → Deep Linking
- [x] Gruppennachrichten Notifications
- [x] Direktnachrichten Notifications
- [x] App Badge Counter
- [x] Chat Mute/Unmute
- [x] "Nicht stören" Modus
- [x] Notification Settings per User
- [x] Sound Benachrichtigungen
- [x] Service Worker mit Push Handler
- [x] Firebase Cloud Functions
- [x] Automatisches Token Cleanup

### 🚧 Optional / Erweiterbar
- [ ] @mentions Highlighting mit Extra Notification
- [ ] Notification Grouping (mehrere Nachrichten zusammenfassen)
- [ ] Custom Notification Sounds per Chat
- [ ] Rich Notifications mit Bildern
- [ ] Quick Reply in Notification
- [ ] Notification History
- [ ] Desktop-spezifische Einstellungen

---

## 📝 Wichtige Hinweise

1. **HTTPS erforderlich:** Push Notifications funktionieren nur über HTTPS (oder localhost)
2. **Browser Support:** Chrome, Firefox, Edge, Safari 16.4+
3. **Firebase Blaze Plan:** Cloud Functions erfordern Pay-as-you-go Plan
4. **Token Expiration:** FCM Tokens können ablaufen, daher regelmäßig refreshen
5. **Notification Limits:** Firebase FCM hat Rate Limits (500 Nachrichten/Sekunde)
6. **iOS Safari:** Volle PWA Notification Support erst ab iOS 16.4

---

## 🚀 Nächste Schritte

1. VAPID Key in `modules/notifications.js` einfügen
2. Firebase Functions deployen
3. UI für Notifications in `index.html` hinzufügen
4. Testen in verschiedenen Browsern
5. Mobile PWA Installation testen
6. Firebase Console Monitoring einrichten
7. Analytics für Notification Engagement hinzufügen

---

## 📚 Ressourcen

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

**✅ Phase 6 Ready!** Alle Dateien sind committed und bereit für Deployment.
