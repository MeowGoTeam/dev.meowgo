import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
auth.languageCode = 'it';
const USER_KEY = 'meowgo_test_user';

function showError(message, kind = 'danger') {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.className = `alert alert-${kind} small p-2 mb-3`;
  errorDiv.setAttribute('role', 'status');
}
function clearMessage() {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = '';
  errorDiv.className = 'alert alert-danger d-none small p-2 mb-3';
}
function firebaseErrorMessage(err) {
  const code = err?.code || err?.message || '';
  const messages = {
    'auth/email-already-in-use': 'Questa email è già registrata. Accedi oppure usa “Hai dimenticato la password?”.',
    'auth/invalid-credential': 'Email o password non corrette.',
    'auth/user-not-found': 'Non esiste un account con questa email.',
    'auth/wrong-password': 'Password non corretta.',
    'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
    'auth/invalid-email': 'Inserisci un indirizzo email valido.',
    'auth/too-many-requests': 'Troppi tentativi. Attendi qualche minuto e riprova.',
    'auth/operation-not-allowed': 'La registrazione email/password non è attiva in Firebase Authentication.',
    'auth/network-request-failed': 'Connessione non disponibile. Controlla Internet e riprova.',
    'auth/unauthorized-domain': 'Questo dominio non è autorizzato in Firebase Authentication.',
    'PERMISSION_DENIED': 'Firebase ha rifiutato il salvataggio del profilo. Controlla le regole del progetto ogwoem.'
  };
  return messages[code] || err?.message || 'Si è verificato un errore. Riprova.';
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
function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  clearMessage();
  if (isRegisterMode) {
    document.getElementById('auth-title').innerText = 'Nuova registrazione';
    document.getElementById('auth-subtitle').innerText = 'Crea il tuo account MeowGo.';
    document.getElementById('username-container').classList.remove('d-none');
    document.getElementById('auth-username').required = true;
    document.getElementById('auth-submit-btn').innerText = 'Registrati ora 🚀';
    document.getElementById('auth-switch-text').innerText = 'Hai già un account?';
    document.getElementById('auth-toggle-btn').innerText = 'Accedi';
    document.getElementById('auth-password').setAttribute('autocomplete', 'new-password');
  } else {
    document.getElementById('auth-title').innerText = 'Accedi a MeowGo';
    document.getElementById('auth-subtitle').innerText = 'Accedi con il tuo account.';
    document.getElementById('username-container').classList.add('d-none');
    document.getElementById('auth-username').required = false;
    document.getElementById('auth-submit-btn').innerText = 'Accedi 🚀';
    document.getElementById('auth-switch-text').innerText = 'Non hai ancora un account?';
    document.getElementById('auth-toggle-btn').innerText = 'Registrati ora';
    document.getElementById('auth-password').setAttribute('autocomplete', 'current-password');
  }
}

document.getElementById('auth-toggle-btn')?.addEventListener('click', toggleAuthMode);
document.getElementById('reset-password-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  if (!email) { showError('Inserisci prima la tua email nel campo Email.'); document.getElementById('auth-email').focus(); return; }
  const resetBtn = document.getElementById('reset-password-btn');
  resetBtn.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    showError('Se esiste un account associato a questa email, riceverai un link per reimpostare la password.', 'success');
  } catch (err) { showError(firebaseErrorMessage(err)); }
  finally { resetBtn.disabled = false; }
});

const form = document.getElementById('auth-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value.trim();
  const submitBtn = document.getElementById('auth-submit-btn');
  clearMessage();
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  const originalButtonText = submitBtn.textContent;

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
        // Mantieni la sessione per permettere di riparare il profilo senza creare account duplicati.
        console.error('Errore salvataggio profilo:', writeError);
        throw new Error('Account autenticato ma profilo non salvato. Verifica le regole del database ogwoem e riprova ad accedere: la beta tenterà di completare il profilo.');
      }
      try { await sendEmailVerification(credential.user); } catch (verificationError) { console.warn('Invio verifica email non riuscito:', verificationError); }
    } else {
      credential = await signInWithEmailAndPassword(auth, email, password);
    }

    const uid = credential.user.uid;
    let profile = { username: credential.user.displayName || email.split('@')[0], xp: 0, catsFound: 0, badges: {} };
    try {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        profile = { ...profile, ...snap.val() };
      } else {
        // Riparazione automatica per account Auth creati senza profilo completo.
        profile.username = username || profile.username;
        await set(ref(db, `users/${uid}`), profile);
        await set(ref(db, `private/${uid}`), { email });
      }
      // Ripara record privato mancante dopo un errore temporaneo in registrazione.
      const privateSnap = await get(ref(db, `private/${uid}`));
      if (!privateSnap.exists()) await set(ref(db, `private/${uid}`), { email });
    } catch (profileError) {
      console.error('Errore recupero profilo:', profileError);
      throw new Error('Accesso riuscito, ma non riesco a leggere/salvare il profilo su ogwoem. Verifica le regole Firebase e riprova.');
    }
    setCurrentUser({ id: uid, uid, username: profile.username, email, xp: profile.xp || 0, catsFound: profile.catsFound || 0, badges: profile.badges || {} });
    if (isRegisterMode && !credential.user.emailVerified) {
      showError('Account creato. Se la verifica email è stata inviata, controlla la posta e la cartella spam. Puoi continuare nella beta anche se la verifica non arriva subito.', 'success');
    }
    window.location.href = '../feed/feed.html';
  } catch (err) {
    showError(firebaseErrorMessage(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitBtn.textContent = originalButtonText;
  }
});
