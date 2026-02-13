import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlZRSrjkYYP8KtycZOah8fX-RMMnYYPj4",
  authDomain: "pwa-messenger-oliver.firebaseapp.com",
  projectId: "pwa-messenger-oliver",
  storageBucket: "pwa-messenger-oliver.firebasestorage.app",
  messagingSenderId: "171952836516",
  appId: "1:171952836516:web:427a7829345cde6ed8fb31",
  measurementId: "G-0W21RL0G06"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let unsubscribe;

// Login/Reg
window.signup = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) { alert(e.message); }
};

window.login = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) { alert(e.message); }
};

window.logout = () => signOut(auth);

// Chat UI
function showChat() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('chat').style.display = 'block';
  loadMessages();
}

function hideChat() {
  document.getElementById('chat').style.display = 'none';
  document.getElementById('login').style.display = 'block';
  if (unsubscribe) unsubscribe();
}

window.sendMessage = async () => {
  const text = document.getElementById('messageInput').value.trim();
  if (!text || !auth.currentUser) return;
  try {
    await addDoc(collection(db, 'messages'), {
      text, uid: auth.currentUser.uid, createdAt: serverTimestamp()
    });
    document.getElementById('messageInput').value = '';
  } catch (e) { alert(e.message); }
};

function loadMessages() {
  const q = query(collection(db, 'messages'), orderBy('createdAt'));
  unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = document.getElementById('messages');
    msgs.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'message';
      div.textContent = `${data.uid.slice(0,8)}: ${data.text}`;
      msgs.appendChild(div);
    });
    msgs.scrollTop = msgs.scrollHeight;
  });
}

// Auth State
onAuthStateChanged(auth, (user) => {
  if (user) showChat();
  else hideChat();
});
