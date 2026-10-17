import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469",
  measurementId: "G-GE1WZ5JQPV"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const USER_KEY = 'meowgo_test_user';

function showError(message) {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.classList.remove('d-none');
}
function setCurrentUser(user) {
  // Solo dati non segreti per compatibilità temporanea con le pagine beta.
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('meowgo_uid', user.id);
}

onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    localStorage.setItem('meowgo_uid', firebaseUser.uid);
    if (location.pathname.endsWith('/login.html')) {
      // Non reindirizzare finché l'utente sta completando un'azione esplicita.
      const saved = localStorage.getItem(USER_KEY);
      if (saved) window.location.replace('../feed/feed.html');
    }
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('meowgo_uid');
  }
});

let isRegisterMode = false;
window.toggleAuthMode = function () {
  isRegisterMode = !isRegisterMode;
  document.getElementById('auth-error').classList.add('d-none');
  if (isRegisterMode) {
    document.getElementById('auth-title').innerText = 'Nuova registrazione';
    document.getElementById('auth-subtitle').innerText = 'Crea il tuo account MeowGo.';
    document.getElementById('username-container').classList.remove('d-none');
    document.getElementById('auth-username').required = true;
    document.getElementById('auth-submit-btn').innerText = 'Registrati ora 🚀';
    document.getElementById('auth-switch-text').innerText = 'Hai già un account?';
  } else {
    document.getElementById('auth-title').innerText = 'Accedi a MeowGo';
    document.getElementById('auth-subtitle').innerText = 'Accedi con il tuo account.';
    document.getElementById('username-container').classList.add('d-none');
    document.getElementById('auth-username').required = false;
    document.getElementById('auth-submit-btn').innerText = 'Accedi 🚀';
    document.getElementById('auth-switch-text').innerText = 'Non hai ancora un account?';
  }
};

const form = document.getElementById('auth-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value.trim();
  const submitBtn = document.getElementById('auth-submit-btn');
  document.getElementById('auth-error').classList.add('d-none');
  submitBtn.disabled = true;

  try {
    let credential;
    if (isRegisterMode) {
      if (!/^[A-Za-z0-9_ .-]{2,30}$/.test(username)) {
        throw new Error('Il nickname deve contenere 2–30 caratteri: lettere, numeri, spazi, punto, trattino o underscore.');
      }
      credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;
      try {
        await set(ref(db, `users/${uid}`), { username, xp: 0, catsFound: 0, badges: {} });
        await set(ref(db, `private/${uid}`), { email });
      } catch (writeError) {
        // Evita un account Auth senza profilo silenzioso; mostra indicazioni per il beta admin.
        await signOut(auth);
        throw new Error('Account creato ma il profilo non è stato salvato. Verifica le regole Firebase e riprova con una nuova email o chiedi supporto.');
      }
    } else {
      credential = await signInWithEmailAndPassword(auth, email, password);
    }

    const uid = credential.user.uid;
    let profile = { username: credential.user.displayName || email.split('@')[0], xp: 0, catsFound: 0, badges: {} };
    try {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) profile = { ...profile, ...snap.val() };
    } catch (_) { /* Il controllo accessi effettivo resta Firebase Auth; il profilo si può riparare in beta. */ }
    setCurrentUser({ id: uid, uid, username: profile.username, email, xp: profile.xp || 0, catsFound: profile.catsFound || 0, badges: profile.badges || {} });
    window.location.href = '../feed/feed.html';
  } catch (err) {
    const messages = {
      'auth/email-already-in-use': 'Questa email è già registrata. Accedi invece di registrarti.',
      'auth/invalid-credential': 'Email o password non corrette.',
      'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
      'auth/invalid-email': 'Inserisci un indirizzo email valido.',
      'auth/too-many-requests': 'Troppi tentativi. Attendi qualche minuto e riprova.',
      'PERMISSION_DENIED': 'Firebase ha rifiutato il salvataggio. Controlla le regole del database per il progetto ogwoem.'
    };
    showError(messages[err.code] || messages[err.message] || err.message || 'Si è verificato un errore. Riprova.');
  } finally {
    submitBtn.disabled = false;
  }
});
