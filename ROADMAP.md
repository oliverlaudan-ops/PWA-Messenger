# PWA Messenger - Development Roadmap

## 📅 Project Overview

**Repository**: https://github.com/oliverlaudan-ops/PWA-Messenger

**Live URL**: https://messenger.future-pulse.tech

**Started**: February 13, 2026

**Tech Stack**:
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Firebase (Auth, Firestore, Hosting)
- PWA: Service Worker, Manifest
- Deployment: GitHub Actions → Firebase Hosting

---

## ✅ Completed Features (Phase 0 + 1)

### 🔐 Authentication & User Management
- [x] Email/Password Registration
- [x] Email/Password Login
- [x] Username System (unique, 3-20 chars, lowercase)
- [x] User Profile Storage (Firestore `users` collection)
- [x] Session Management (Firebase Auth State)
- [x] Logout Functionality

### 👥 Group Chat
- [x] Public Test Group
- [x] Real-time Message Sync (Firestore `onSnapshot`)
- [x] Message Display with Username
- [x] Send Messages with Enter Key
- [x] Auto-scroll to Latest Message
- [x] **Bug Fix**: Prevented Message Duplication (using `docChanges()`)
- [x] Message Limit: Last 50 Messages

### 💬 Direct Messages (1-on-1)
- [x] Tab Navigation (Groups / Direct Messages)
- [x] User Search Modal
  - Search by @username or email
  - Real-time filtering
  - Avatar display (first letter)
- [x] DM Chat View
  - Separate chat window
  - Back button navigation
  - Real-time message sync
- [x] **Chat ID System**: Sorted UIDs (`uid1_uid2`)
- [x] Firestore Structure: `directMessages/{chatId}/messages/`
- [x] Send/Receive DMs in Real-time

### 🎨 UI/UX
- [x] Modern Gradient Design (Purple/Blue)
- [x] Responsive Layout (Mobile + Desktop)
- [x] Tab Navigation with Active State
- [x] Modal Overlays (User Search)
- [x] Smooth Animations (Slide-in, Hover Effects)
- [x] Loading Spinners
- [x] Error Messages with Auto-hide

### 🛠️ Technical Optimizations
- [x] User Cache (prevent redundant Firestore reads)
- [x] Incremental Message Rendering (no full re-render)
- [x] Data Attribute IDs (`data-msg-id`, `data-dm-msg-id`)
- [x] Listener Cleanup on Logout
- [x] GitHub Actions CI/CD Pipeline

---

## 🚧 In Progress

**Current Status**: Planning Phase 2

**Next Up**: Timestamps + DM Overview

---

## 📈 Future Development Plan

### **Phase 2: Core Messaging Features** (Estimated: 2-3h)

#### Session 2.1: Timestamps & Time Display
- [ ] Add `createdAt` timestamp display to messages
- [ ] Format timestamps:
  - Today: "14:35"
  - Yesterday: "Gestern 14:35"
  - Older: "12.02.2026 14:35"
- [ ] Show timestamps in both Group Chat and DMs
- [ ] Add `.time` CSS class styling

#### Session 2.2: DM Overview (Chat List)
- [ ] Query all DM chats for current user
- [ ] Load last message from each chat
- [ ] Display chat list:
  - Avatar (first letter)
  - Username
  - Last message preview (max 50 chars)
  - Timestamp
- [ ] Click opens DM chat
- [ ] Sort by most recent activity
- [ ] Replace placeholder in `dmListView`

#### Session 2.3: Unread Counter
- [ ] Track unread messages per chat
- [ ] Store `lastRead` timestamp per user/chat
- [ ] Display unread badge on chat list
- [ ] Display unread count on DM tab
- [ ] Mark as read when chat is opened

#### Session 2.4: Online Status
- [ ] Update `users` collection with `lastSeen` timestamp
- [ ] Display online indicator (green dot)
- [ ] Show "Online" vs "Last seen X min ago"
- [ ] Real-time status updates

#### Session 2.5: Typing Indicator
- [ ] Firestore field: `typing` (boolean + timestamp)
- [ ] Show "@username is typing..." indicator
- [ ] Auto-clear after 3 seconds of inactivity
- [ ] Display in both groups and DMs

---

### **Phase 3: Group Management** (Estimated: 3-4h)

#### Session 3.1: Create Groups
- [ ] "Create Group" button
- [ ] Group creation modal:
  - Group name (required)
  - Description (optional)
  - Privacy (Public/Private)
- [ ] Firestore `groups` collection:
  ```
  groups/
    ├─ {groupId}/
    │   ├─ name
    │   ├─ description
    │   ├─ createdBy (uid)
    │   ├─ createdAt
    │   ├─ privacy (public/private)
    │   ├─ members/ (map: uid → role)
    │   └─ messages/
  ```
- [ ] Creator becomes Admin

#### Session 3.2: Group List & Join
- [ ] Display user's groups in Groups tab
- [ ] Browse public groups
- [ ] Join/Leave groups
- [ ] Group-specific message loading

#### Session 3.3: Invite Members
- [ ] "Add Members" button in group
- [ ] User search modal (reuse existing)
- [ ] Send invitations
- [ ] Accept/Decline invitations

#### Session 3.4: Admin System
- [ ] Member roles: `admin`, `member`
- [ ] Admin actions:
  - Remove members
  - Promote to admin
  - Edit group info
  - Delete group
- [ ] Permission checks

---

### **Phase 4: Rich Media & Interactions** (Estimated: 4-5h)

#### Session 4.1: Emoji Picker
- [ ] Integrate emoji picker library (e.g., `emoji-picker-element`)
- [ ] Emoji button next to message input
- [ ] Insert emoji at cursor position

#### Session 4.2: Image Upload
- [ ] File input for images
- [ ] Upload to Firebase Storage
- [ ] Display images in chat
- [ ] Image preview before sending
- [ ] Thumbnail generation

#### Session 4.3: Message Reactions
- [ ] React to messages with emojis
- [ ] Firestore: `reactions` subcollection
- [ ] Display reaction count
- [ ] Click to add/remove reaction

#### Session 4.4: Message Actions
- [ ] Long-press / right-click menu
- [ ] Edit message (owner only)
- [ ] Delete message (owner + admin)
- [ ] Copy message text
- [ ] Reply to message (threading)

---

### **Phase 5: Utility Bots (No External APIs)** (Estimated: 3-4h)

#### Session 5.1: Bot Framework
- [ ] Command parser (detect `/command`)
- [ ] Bot registry (list of available bots)
- [ ] Bot response system
- [ ] Firebase Cloud Functions setup
- [ ] Bot user accounts (special UIDs)

#### Session 5.2: Reminder Bot ⏰
- [ ] Command: `/remind [time] [message]`
- [ ] Parse time expressions:
  - "in 10 minutes"
  - "at 15:30"
  - "tomorrow at 9am"
- [ ] Store reminder in Firestore `reminders` collection
- [ ] Scheduled Cloud Function to send reminder
- [ ] Cancel reminder: `/cancel_reminder [id]`

#### Session 5.3: Poll Bot 📊
- [ ] Command: `/poll [question] | [option1] | [option2] ...`
- [ ] Create interactive poll message
- [ ] Vote buttons (Firestore transactions)
- [ ] Display vote count
- [ ] Close poll: `/close_poll`

#### Session 5.4: Welcome Bot 👋
- [ ] Automatic greeting for new group members
- [ ] Customizable welcome message
- [ ] Show group rules/info

#### Session 5.5: Fun Bots 🎲
- [ ] `/roll [sides]` - Dice roller (default d6)
- [ ] `/coinflip` - Heads or tails
- [ ] `/8ball [question]` - Magic 8-ball
- [ ] `/joke` - Random joke

---

### **Phase 6: AI Integration with Perplexity API** 🧠 (Estimated: 3-4h)

**Prerequisites**:
- Perplexity Pro Account (already available)
- API Key from https://www.perplexity.ai/settings/api
- $5/month free credits included

#### Session 6.1: API Setup
- [ ] Generate Perplexity API Key
- [ ] Store API Key in Firebase Environment Variables
- [ ] Test API connection
- [ ] Create Firebase Cloud Function wrapper

#### Session 6.2: Sonar Chat Bot 🤖
- [ ] Command: `/ask [question]`
- [ ] Call Perplexity Sonar API
- [ ] Display response with citations
- [ ] Conversation context (last N messages)
- [ ] Token/cost tracking

#### Session 6.3: Summary Bot 📝
- [ ] Command: `/summary [count]`
- [ ] Fetch last N messages from chat
- [ ] Send to Perplexity API for summarization
- [ ] Display concise summary
- [ ] Optional: Daily auto-summaries

#### Session 6.4: Translate Bot 🌍
- [ ] Command: `/translate [lang] [text]`
- [ ] Auto-detect source language
- [ ] Translate using Perplexity API
- [ ] Support common languages (EN, DE, ES, FR, etc.)

#### Session 6.5: Image Generation Bot 🎨 (Future)
- [ ] Requires DALL-E or Stable Diffusion API
- [ ] Command: `/imagine [prompt]`
- [ ] Generate image
- [ ] Upload to Firebase Storage
- [ ] Display in chat

---

### **Phase 7: PWA & Notifications** (Estimated: 2-3h)

#### Session 7.1: Push Notifications
- [ ] Request notification permission
- [ ] Firebase Cloud Messaging (FCM) setup
- [ ] Send notifications for:
  - New DMs
  - Group mentions
  - Reminders
- [ ] Notification settings per chat

#### Session 7.2: Offline Mode
- [ ] Service Worker caching strategy
- [ ] Queue messages when offline
- [ ] Sync when back online
- [ ] Show offline indicator

#### Session 7.3: Install Prompt
- [ ] Detect if app is installable
- [ ] Show "Add to Home Screen" prompt
- [ ] Custom install UI
- [ ] Track install analytics

---

### **Phase 8: Advanced Features** (Future)

#### User Profile
- [ ] Profile picture upload
- [ ] Bio/Status text
- [ ] Edit profile modal
- [ ] View other user profiles

#### Voice Messages
- [ ] Record audio
- [ ] Upload to Firebase Storage
- [ ] Audio player in chat

#### Video Calls (Stretch Goal)
- [ ] WebRTC integration
- [ ] 1-on-1 video calls
- [ ] Screen sharing

#### Search
- [ ] Search messages in chat
- [ ] Search across all chats
- [ ] Filter by date/user

#### Analytics
- [ ] User activity tracking
- [ ] Message statistics
- [ ] Bot usage metrics

---

## 📊 Progress Tracking

### Milestones

- [x] **Milestone 1**: Basic Messenger (Auth + Group Chat) → Feb 13, 2026
- [x] **Milestone 2**: Direct Messages → Feb 13, 2026
- [ ] **Milestone 3**: Core Features (Timestamps, DM Overview, Status)
- [ ] **Milestone 4**: Group Management
- [ ] **Milestone 5**: Utility Bots
- [ ] **Milestone 6**: AI Integration
- [ ] **Milestone 7**: PWA Features
- [ ] **Milestone 8**: v1.0 Production Release

### Time Estimates

| Phase | Estimated Time | Status |
|-------|----------------|--------|
| Phase 0-1 (Completed) | ~4-5h | ✅ Done |
| Phase 2 (Core Features) | 2-3h | 🕐 Next |
| Phase 3 (Groups) | 3-4h | ⏳ Planned |
| Phase 4 (Rich Media) | 4-5h | ⏳ Planned |
| Phase 5 (Bots) | 3-4h | ⏳ Planned |
| Phase 6 (AI) | 3-4h | ⏳ Planned |
| Phase 7 (PWA) | 2-3h | ⏳ Planned |
| **Total Remaining** | **~17-23h** | - |

---

## 📝 Development Notes

### Current File Structure

```
PWA-Messenger/
├── index.html          # Main HTML with all screens
├── styles.css          # Complete CSS styling
├── firebase.js         # Firebase logic + all features
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── .github/
│   └── workflows/
│       └── firebase-hosting-merge.yml  # Auto-deploy
└── ROADMAP.md          # This file
```

### Firestore Collections

```
Firestore/
├── users/
│   └── {uid}/
│       ├── username (string)
│       ├── email (string)
│       └── createdAt (timestamp)
├── messages/               # Public test group
│   └── {messageId}/
│       ├── text (string)
│       ├── uid (string)
│       ├── username (string)
│       └── createdAt (timestamp)
└── directMessages/
    └── {chatId}/            # Format: uid1_uid2 (sorted)
        └── messages/
            └── {messageId}/
                ├── text (string)
                ├── uid (string)
                ├── username (string)
                └── createdAt (timestamp)
```

### Key Functions Reference

**Authentication**:
- `signup()` - Register new user
- `login()` - Sign in user
- `logout()` - Sign out user
- `setUsername()` - Create username profile

**Messaging**:
- `sendMessage()` - Send group message
- `sendDMMessage()` - Send direct message
- `loadMessages()` - Load group messages
- `loadDMMessages(otherUserId)` - Load DM messages

**Navigation**:
- `switchTab(tabName)` - Switch between Groups/DMs
- `showUserSearch()` - Open user search modal
- `startDirectMessage(user)` - Open DM chat
- `closeDMChat()` - Close DM and return to list

**Utilities**:
- `createChatId(uid1, uid2)` - Generate sorted chat ID
- `loadUserData(uid)` - Get user profile (cached)
- `appendMessage(docSnap)` - Render single message
- `appendDMMessage(docSnap)` - Render single DM message

---

## 🛠️ Setup Instructions (For Future Reference)

### Prerequisites
- Node.js (for Firebase CLI)
- Firebase Project
- GitHub Account

### Firebase Setup
1. Create Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Add web app to Firebase project
5. Copy config to `firebase.js`

### GitHub Actions Setup
1. Generate Firebase token: `firebase login:ci`
2. Add token to GitHub Secrets as `FIREBASE_TOKEN`
3. Push triggers auto-deploy

### Local Development
```bash
# Clone repository
git clone https://github.com/oliverlaudan-ops/PWA-Messenger.git
cd PWA-Messenger

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Serve locally
firebase serve
```

---

## 📞 Contact & Resources

**Live App**: https://messenger.future-pulse.tech

**GitHub**: https://github.com/oliverlaudan-ops/PWA-Messenger

**Firebase Console**: [Your Firebase Project URL]

**Perplexity API Docs**: https://docs.perplexity.ai/

**Next Session**: Phase 2.1 - Timestamps

---

**Last Updated**: February 13, 2026, 14:58 CET

**Version**: 0.2.0
