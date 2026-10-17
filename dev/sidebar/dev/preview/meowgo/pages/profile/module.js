import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  get,
  update,
  remove,
  onValue,
  onChildAdded,
  set
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Inserisci qui la tua chiave ImgBB.
// La chiave è esposta nel browser: controllala e ruotala se necessario.
const IMGBB_API_KEY = "INSERISCI_LA_TUA_CHIAVE_IMGBB";

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

let messaging = null;
let currentUser = null;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("meowgo_test_user")) || null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem("meowgo_test_user", JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem("meowgo_test_user");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showError(message) {
  console.error(message);
  alert(message);
}

// Attende il ripristino della sessione Firebase.
const authenticatedUser = await new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, user => {
    unsubscribe();
    resolve(user || null);
  }, () => resolve(null));
});

if (!authenticatedUser) {
  clearStoredUser();
  window.location.replace("../login/login.html");
  throw new Error("Sessione Firebase assente.");
}

const storedUser = getStoredUser();

// La UID Firebase autenticata è l'identificatore attendibile.
currentUser = {
  ...(storedUser || {}),
  id: authenticatedUser.uid,
  uid: authenticatedUser.uid,
  email: authenticatedUser.email || "",
  username: storedUser?.username || authenticatedUser.displayName || "Utente",
  xp: Number(storedUser?.xp || 0),
  catsFound: Number(storedUser?.catsFound || 0),
  badges: storedUser?.badges || {}
};

setStoredUser(currentUser);

// ------------------------------
// NOTIFICHE
// ------------------------------

try {
  messaging = getMessaging(app);

  if ("Notification" in window && "serviceWorker" in navigator) {
    Notification.requestPermission().then(async permission => {
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register(
        "../../firebase-messaging-sw.js"
      );

      // Il token non viene salvato nel profilo perché le regole fornite
      // non prevedono un campo per questo dato.
      await getToken(messaging, {
        serviceWorkerRegistration: registration
      }).catch(error => {
        console.warn("Token notifiche non disponibile:", error);
      });
    }).catch(error => {
      console.warn("Permesso notifiche non disponibile:", error);
    });
  }
} catch (error) {
  console.warn("Notifiche non disponibili:", error);
}

if (messaging) {
  onMessage(messaging, payload => {
    if (payload.notification) {
      sendNativeNotification(
        payload.notification.title || "MeowGo",
        payload.notification.body || "",
        payload.notification.image || null
      );
    }
  });
}

async function sendNativeNotification(title, body, imageUrl = null) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const options = {
    body: body || "",
    icon: "../../assets/icons/icon-512.png",
    badge: "../../assets/icons/icon-512.png",
    data: {
      url: new URL("../feed/feed.html", location.href).href
    }
  };

  if (imageUrl) options.image = imageUrl;

  try {
    const registration = await navigator.serviceWorker.ready;

    if (registration?.showNotification) {
      await registration.showNotification(title || "MeowGo", options);
    } else {
      new Notification(title || "MeowGo", options);
    }
  } catch (error) {
    console.warn("Errore notifica:", error);
  }
}

// ------------------------------
// NAVIGAZIONE
// ------------------------------

function renderNavbar(activePage) {
  const navLinks = document.getElementById("nav-links");
  if (!navLinks) return;

  const username = escapeHTML(currentUser.username);

  navLinks.innerHTML = `
    <li class="nav-item">
      <a class="nav-link fw-bold ${activePage === "feed" ? "text-warning" : "text-dark"}"
         href="../feed/feed.html">
        <i class="fa-solid fa-newspaper"></i> Feed
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link fw-bold ${activePage === "garden" ? "text-warning" : "text-success"}"
         href="../garden/garden.html">
        <i class="fa-solid fa-tree"></i> MeowGarden
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link fw-bold ${activePage === "profile" ? "text-warning" : "text-dark"}"
         href="./profile.html">
        <i class="fa-solid fa-user"></i> Profilo (${username})
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link fw-bold text-danger" href="#" id="logout-link">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </a>
    </li>
  `;

  const logoutLink = document.getElementById("logout-link");

  logoutLink?.addEventListener("click", async event => {
    event.preventDefault();

    try {
      await signOut(auth);
    } finally {
      clearStoredUser();
      window.location.href = "../login/login.html";
    }
  });
}

renderNavbar("profile");

// ------------------------------
// PROFILO
// ------------------------------

function renderProfileHeader(user) {
  if (!user) return;

  const nameElement = document.getElementById("user-display-name");
  const emailElement = document.getElementById("user-email-badge");
  const bioElement = document.getElementById("user-bio");
  const avatarElement = document.getElementById("user-avatar");

  if (nameElement) nameElement.textContent = user.username || "Utente";
  if (emailElement) emailElement.textContent = user.email || "";
  if (bioElement) bioElement.textContent = user.bio || "";

  if (avatarElement) {
    avatarElement.replaceChildren();

    if (user.photoURL) {
      const image = document.createElement("img");
      image.src = user.photoURL;
      image.alt = "Foto profilo";
      avatarElement.appendChild(image);
    } else {
      avatarElement.textContent = "😸";
    }
  }
}

renderProfileHeader(currentUser);
updateUI();

// Carica i dati del profilo dal database.
onValue(ref(db, `users/${currentUser.uid}`), snapshot => {
  if (!snapshot.exists()) return;

  const data = snapshot.val();

  currentUser = {
    ...currentUser,
    username: data.username || currentUser.username,
    xp: Number(data.xp || 0),
    catsFound: Number(data.catsFound || 0),
    badges: data.badges || {}
  };

  setStoredUser(currentUser);
  renderProfileHeader(currentUser);
  updateUI();
}, error => {
  console.error("Errore caricamento profilo:", error);
});

// ------------------------------
// BAN
// ------------------------------

function checkBanStatus() {
  onValue(ref(db, `bans/${currentUser.uid}`), snapshot => {
    if (!snapshot.exists()) return;

    const ban = snapshot.val();
    const until = ban?.until;

    // Le regole fornite salvano until come stringa.
    // Il formato deve essere concordato con chi gestisce i ban.
    const isPermanent = until === "indefinite";
    const expiry = until ? Date.parse(until) : NaN;
    const isActive = isPermanent || (Number.isFinite(expiry) && expiry > Date.now());

    if (!isActive) return;

    document.body.innerHTML = `
      <main style="max-width:650px;margin:12vh auto;padding:24px;text-align:center;font-family:sans-serif">
        <h1 style="color:#dc2626">⛔ Account bloccato</h1>
        <p>Il tuo account è stato sospeso da MeowGo.</p>
        <p>Motivo: ${escapeHTML(ban.reason || "Violazione delle regole della community")}</p>
        <a href="../login/login.html">Torna alla pagina di accesso</a>
      </main>
    `;
  }, error => {
    console.error("Errore controllo ban:", error);
  });
}

checkBanStatus();

// ------------------------------
// NOTIFICHE DATABASE
// ------------------------------

// Nota: le regole che hai fornito non autorizzano necessariamente
// notifications/global o notifications/direct/{uid}.
// Non attiviamo queste letture finché i percorsi non sono stati
// allineati alle regole effettive del progetto.

// ------------------------------
// MODAL E PANNELLO IMPOSTAZIONI
// ------------------------------

const deleteModalElement = document.getElementById("deletePostModal");
const deleteModal = deleteModalElement && window.bootstrap
  ? new bootstrap.Modal(deleteModalElement)
  : null;

const settingsSidebarElement = document.getElementById("settings-sidebar");
const settingsSidebar = settingsSidebarElement && window.bootstrap
  ? bootstrap.Offcanvas.getOrCreateInstance(settingsSidebarElement)
  : null;

document.getElementById("open-delete-modal-btn")?.addEventListener("click", () => {
  settingsSidebar?.hide();
  loadMyPosts();
  deleteModal?.show();
});

document.getElementById("sidebar-logout-link")?.addEventListener("click", async event => {
  event.preventDefault();

  try {
    await signOut(auth);
  } finally {
    clearStoredUser();
    window.location.href = "../login/login.html";
  }
});

// ------------------------------
// POST DEL PROFILO
// ------------------------------

function formatPostTimestamp(post) {
  if (post.createdAt) {
    const date = new Date(post.createdAt);

    return `${date.toLocaleDateString("it-IT")} - ${
      date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit"
      })
    }`;
  }

  return "Data non disponibile";
}

async function loadMyPosts() {
  const container = document.getElementById("my-posts-list");
  if (!container) return;

  container.textContent = "Caricamento post...";

  try {
    const snapshot = await get(ref(db, "sightings"));

    if (!snapshot.exists()) {
      container.textContent = "Non hai ancora pubblicato nessun post.";
      return;
    }

    const data = snapshot.val();

    const posts = Object.entries(data)
      .filter(([, post]) =>
        post &&
        post.userId === currentUser.uid &&
        post.deleted !== true
      )
      .map(([id, post]) => ({
        id,
        ...post,
        imageUrl: post.photo || ""
      }))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    container.replaceChildren();

    if (posts.length === 0) {
      container.textContent = "Non hai ancora pubblicato nessun post attivo.";
      return;
    }

    posts.forEach(post => {
      const item = document.createElement("div");
      item.className =
        "d-flex align-items-center justify-content-between p-2 border rounded-3 bg-white shadow-sm";

      const details = document.createElement("div");
      details.className = "d-flex align-items-center gap-3";

      const image = document.createElement("img");
      image.className = "my-post-thumb";
      image.src = post.imageUrl;
      image.alt = post.catName || "Foto gatto";

      const textWrap = document.createElement("div");

      const title = document.createElement("h6");
      title.className = "mb-0 fw-bold text-dark";
      title.textContent = post.catName || "Gatto";

      const date = document.createElement("small");
      date.className = "text-muted";
      date.textContent = formatPostTimestamp(post);

      textWrap.append(title, date);
      details.append(image, textWrap);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-outline-danger btn-sm rounded-3 ms-2";
      deleteButton.textContent = "Elimina";
      deleteButton.addEventListener("click", () => {
        window.confirmAndDeletePost(post.id);
      });

      item.append(details, deleteButton);
      container.appendChild(item);
    });
  } catch (error) {
    console.error("Errore caricamento post:", error);
    container.textContent = "Non è stato possibile caricare i post. Riprova.";
  }
}

window.confirmAndDeletePost = async function(postId) {
  if (!confirm("Vuoi davvero eliminare questo post?")) return;

  try {
    // Le regole devono permettere al proprietario di eliminare
    // il proprio avvistamento. La UID viene verificata da Firebase.
    await remove(ref(db, `sightings/${postId}`));

    // XP e badge NON vengono modificati dal client:
    // devono essere gestiti da un backend fidato per evitare manipolazioni.
    await loadMyPosts();
  } catch (error) {
    console.error("Errore eliminazione post:", error);
    showError(
      "Impossibile eliminare il post. Verifica i permessi Firebase e riprova."
    );
  }
};

// ------------------------------
// CARICAMENTO FOTO E AVVISTAMENTO
// ------------------------------

const uploadForm = document.getElementById("upload-form");

uploadForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const nameInput = document.getElementById("cat-name-input");
  const photoInput = document.getElementById("cat-photo-input");
  const uploadButton = document.getElementById("upload-btn");

  if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
    showError("La sessione non è valida. Accedi nuovamente.");
    return;
  }

  const photoFile = photoInput?.files?.[0];

  if (!photoFile) {
    showError("Seleziona una foto prima di caricare.");
    return;
  }

  if (!IMGBB_API_KEY || IMGBB_API_KEY === "INSERISCI_LA_TUA_CHIAVE_IMGBB") {
    showError("Configura la chiave ImgBB prima di caricare le immagini.");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(photoFile.type)) {
    showError("Formato non supportato. Usa JPG, PNG o WebP.");
    return;
  }

  if (photoFile.size > 5 * 1024 * 1024) {
    showError("La foto supera il limite di 5 MB.");
    return;
  }

  const catName = nameInput?.value?.trim() || "";

  if (catName.length < 1 || catName.length > 50) {
    showError("Il nome del gatto deve contenere da 1 a 50 caratteri.");
    return;
  }

  uploadButton.disabled = true;
  uploadButton.textContent = "Caricamento...";

  try {
    // 1. Carica l'immagine sul servizio esterno.
    const formData = new FormData();
    formData.append("image", photoFile);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
      {
        method: "POST",
        body: formData
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success || !result?.data?.url) {
      throw new Error("Il servizio immagini non ha accettato il file.");
    }

    const imageUrl = result.data.url;

    // 2. Scrive il post nel percorso previsto dalle regole RTDB.
    const sightingRef = push(ref(db, "sightings"));

    await set(sightingRef, {
      userId: auth.currentUser.uid,
      catName,
      photo: imageUrl,
      description: "",
      createdAt: Date.now()
    });

    // Non aggiorniamo XP o badge dal browser:
    // questi dati possono essere manipolati dal client.
    // Per assegnarli in modo sicuro serve una Cloud Function
    // o un altro backend con privilegi controllati.

    if (typeof confetti === "function") {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    await sendNativeNotification(
      "📸 Gatto registrato!",
      `Hai aggiunto ${catName}!`
    );

    nameInput.value = "";
    photoInput.value = "";

    alert("Gatto caricato correttamente!");

    window.location.href = "../feed/feed.html";
  } catch (error) {
    console.error("Errore caricamento MeowGo:", error);

    const message = String(error?.message || "");

    if (
      message.includes("PERMISSION_DENIED") ||
      message.includes("permission_denied")
    ) {
      showError(
        "Firebase ha negato il salvataggio. Verifica che le regole permettano " +
        "a un utente autenticato di creare sightings/{id}, che userId corrisponda " +
        "alla UID Firebase e che i campi inviati siano ammessi."
      );
    } else {
      showError("Errore durante il caricamento: " + message);
    }
  } finally {
    if (uploadButton) {
      uploadButton.disabled = false;
      uploadButton.textContent = "🌿 Carica Gatto";
    }
  }
});

// ------------------------------
// LIVELLO, XP E BADGE VISUALI
// ------------------------------

function updateUI() {
  if (!currentUser) return;

  const xp = Number(currentUser.xp || 0);
  const catsFound = Number(currentUser.catsFound || 0);
  const level = Math.floor(xp / 1000) + 1;
  const badges = currentUser.badges || {};

  const levelElement = document.getElementById("user-level");
  const xpElement = document.getElementById("user-xp");
  const barElement = document.getElementById("xp-bar");

  if (levelElement) levelElement.textContent = level;
  if (xpElement) xpElement.textContent = xp % 1000;
  if (barElement) barElement.style.width = `${(xp % 1000) / 10}%`;

  document.getElementById("badge-first")
    ?.classList.toggle("unlocked", catsFound >= 1);

  document.getElementById("badge-hunter")
    ?.classList.toggle("unlocked", catsFound >= 5);

  document.getElementById("badge-master")
    ?.classList.toggle("unlocked", catsFound >= 10);

  document.getElementById("badge-lvl2")
    ?.classList.toggle("unlocked", level >= 2);

  const badgeKeys = [
    "pelata", "maranza", "police", "marescialla", "pizza",
    "space", "ninja", "wizard", "royal", "pirate", "rocker",
    "chef", "hero", "hacker", "detective", "vampire",
    "ghost", "zombie", "soccer", "artist", "gamer"
  ];

  let unlockedCount = 0;

  badgeKeys.forEach(key => {
    const element = document.getElementById(`col-badge-${key}`);
    if (!element) return;

    const unlocked = badges[key] === true;
    element.classList.toggle("unlocked", unlocked);

    if (unlocked) unlockedCount++;
  });

  const secretSection = document.getElementById("secret-badges-section");

  if (secretSection) {
    secretSection.classList.toggle("d-none", unlockedCount === 0);
  }
}
