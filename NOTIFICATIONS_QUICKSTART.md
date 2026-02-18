# 🔔 Push-Benachrichtigungen - Quick Start

## 1-Minute Setup

### Schritt 1: VAPID Key generieren

```bash
# 1. Firebase Console öffnen
open https://console.firebase.google.com/project/pwa-messenger-oliver/settings/cloudmessaging

# 2. Web Push certificates → Generate key pair
# 3. Key kopieren

# 4. Key in modules/notifications.js einfügen:
# Zeile 18: const VAPID_KEY = 'DEIN_KEY_HIER';
```

### Schritt 2: Firebase Functions deployen

```bash
# Terminal:
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Schritt 3: UI erweitern

Füge in `index.html` im Chat Header hinzu:

```html
<button id="notificationToggle" onclick="requestNotifications()" 
        title="Benachrichtigungen aktivieren">
  🔔
</button>
```

### Schritt 4: Auth erweitern

In `modules/auth.js` nach Login:

```javascript
window.dispatchEvent(new CustomEvent('userLoggedIn'));
```

### Fertig! 🎉

App neu laden → auf 🔔 klicken → Permissions erteilen

---

## Schnelltest

```bash
# 1. In zwei Browsern/Tabs einloggen
# 2. Im ersten: Notifications aktivieren
# 3. Im zweiten: Nachricht senden
# 4. Im ersten: Notification sollte erscheinen
```

---

## Features

✅ Gruppennachrichten Notifications  
✅ Direktnachrichten Notifications  
✅ Chat stummschalten  
✅ "Nicht stören" Modus  
✅ App Badge Counter  
✅ Sound Benachrichtigungen  
✅ Click → Chat öffnen  
✅ Background + Foreground Support  

---

## API Verwendung

```javascript
// Notifications aktivieren
await requestNotificationPermission();

// Chat stummschalten (24h)
await muteChat(chatId, 24 * 60 * 60 * 1000);

// Chat entstummen
await unmuteChat(chatId);

// Nicht stören (8h)
await enableDoNotDisturb(8 * 60 * 60 * 1000);

// Nicht stören beenden
await disableDoNotDisturb();

// Badge aktualisieren
updateAppBadge(5); // Zeigt "5"
clearAppBadge();   // Entfernt Badge

// Settings abrufen
const settings = getNotificationSettings();
```

---

## Troubleshooting

**Keine Notification Permission?**
```javascript
Notification.permission // Prüfen
// Falls 'denied': Browser Settings → Site Settings → Notifications zurücksetzen
```

**Cloud Functions Fehler?**
```bash
firebase functions:log
# Häufig: Blaze Plan nicht aktiv
```

**FCM Token nicht gespeichert?**
```javascript
// Console:
console.log(await getNotificationSettings());
// FCM Token sollte in Firestore unter users/{uid}/fcmTokens stehen
```

---

## Firestore Struktur

```javascript
users/{userId} = {
  username: "max",
  email: "max@example.com",
  notificationsEnabled: true,
  fcmTokens: {
    "token_abc123": {
      createdAt: timestamp,
      userAgent: "Chrome 120",
      lastUsed: timestamp
    }
  },
  notificationSettings: {
    enabled: true,
    sound: true,
    doNotDisturb: false,
    doNotDisturbUntil: null,
    chatMuted: {
      "chatId123": timestamp // Mute until
    }
  }
}
```

---

## Browser Support

✅ Chrome 42+  
✅ Firefox 44+  
✅ Edge 17+  
✅ Safari 16.4+ (iOS/macOS)  
❌ Internet Explorer  

---

**Vollständige Dokumentation:** [PHASE_6_SETUP.md](./PHASE_6_SETUP.md)
