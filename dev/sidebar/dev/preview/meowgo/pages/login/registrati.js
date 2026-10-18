import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
  getAuth, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
auth.languageCode = "it";

const form = document.getElementById("register-form");
const message = document.getElementById("auth-message");
const submit = document.getElementById("register-submit");
const emailInput = document.getElementById("register-email");

function showMessage(text, type = "danger") {
  message.textContent = text;
  message.className = `alert alert-${type} small p-2 mb-3`;
}
function errorText(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Questa email è già registrata. Accedi oppure recupera la password.",
    "auth/invalid-email": "Inserisci un indirizzo email valido.",
    "auth/weak-password": "La password deve contenere almeno 6 caratteri.",
    "auth/operation-not-allowed": "La registrazione email/password non è abilitata in Firebase Authentication.",
    "auth/unauthorized-domain": "Questo dominio non è autorizzato in Firebase Authentication.",
    "auth/network-request-failed": "Connessione non disponibile: controlla Internet e riprova.",
    "auth/too-many-requests": "Troppi tentativi. Attendi qualche minuto e riprova.",
    "PERMISSION_DENIED": "Firebase ha rifiutato il salvataggio. Controlla le regole del database ogwoem."
  };
  return map[code] || error?.message || "Registrazione non riuscita. Riprova.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "alert d-none small p-2 mb-3";
  const username = document.getElementById("register-username").value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;
  const confirmation = document.getElementById("register-confirm-password").value;

  if (!/^[A-Za-z0-9_ .-]{2,30}$/.test(username)) {
    showMessage("Il nickname deve contenere 2–30 caratteri: lettere, numeri, spazi, punto, trattino o underscore.");
    return;
  }
  if (password.length < 6) {
    showMessage("La password deve contenere almeno 6 caratteri.");
    return;
  }
  if (password !== confirmation) {
    showMessage("Le due password non coincidono.");
    return;
  }

  submit.disabled = true;
  submit.setAttribute("aria-busy", "true");
  submit.textContent = "Creazione account…";
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // Scrittura separata coerente con le regole proposte per users/{uid} e private/{uid}.
    await set(ref(db, `users/${uid}`), {
      username,
      xp: 0,
      catsFound: 0,
      badges: {}
    });
    await set(ref(db, `private/${uid}`), { email });

    try {
      await sendEmailVerification(credential.user);
    } catch (verificationError) {
      console.warn("Invio verifica email non riuscito:", verificationError);
    }

    localStorage.setItem("meowgo_uid", uid);
    localStorage.setItem("meowgo_test_user", JSON.stringify({
      id: uid, uid, username, email, xp: 0, catsFound: 0, badges: {}
    }));

    showMessage("Account creato! Se la verifica email è stata inviata, controlla la posta e lo spam. Ora puoi accedere a MeowGo.", "success");
    form.reset();
    window.setTimeout(() => { window.location.href = "../feed/feed.html"; }, 1400);
  } catch (error) {
    console.error("Errore registrazione MeowGo:", error);
    showMessage(errorText(error));
  } finally {
    submit.disabled = false;
    submit.removeAttribute("aria-busy");
    submit.textContent = "Crea account 🚀";
  }
});

document.getElementById("forgot-password-btn").addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    showMessage("Inserisci prima la tua email nel campo Email, poi premi di nuovo recupera password.");
    emailInput.focus();
    return;
  }
  const button = document.getElementById("forgot-password-btn");
  button.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Se esiste un account associato a questa email, riceverai un link per reimpostare la password.", "success");
  } catch (error) {
    showMessage(errorText(error));
  } finally {
    button.disabled = false;
  }
});
