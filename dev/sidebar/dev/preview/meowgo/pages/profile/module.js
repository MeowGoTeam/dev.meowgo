import { ref, get, set, update, remove, onValue, onChildAdded, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { app, db, requireUser, renderNavbar, saveLocalUser, logout, isMyPost, formatPostTimestamp, escapeHtml, POSTS_PATH } from "../../assets/js/core.js";

// Chiave ImgBB (visibile nel client: valutare un proxy/ruotarla)
const IMGBB_API_KEY = "82fcd1a9192375d6c456c52e7979599c";

const currentUser = await requireUser();
let messaging = null;

try {
  messaging = getMessaging(app);
  if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(async (permission) => {
      if (permission !== 'granted') return;
      try {
        const swReg = await navigator.serviceWorker.register('../../firebase-messaging-sw.js');
        const token = await getToken(messaging, { serviceWorkerRegistration: swReg });
        if (token) await set(ref(db, `users/${currentUser.id}/fcmToken`), token);
      } catch (e) { console.warn('Token FCM non salvato:', e.message); }
    });
  }
} catch (e) {
  console.warn("FCM non supportato in questo browser:", e);
}

if (messaging) {
  onMessage(messaging, (payload) => {
    if (payload.notification) {
      sendNativeNotification(payload.notification.title || "MeowGo", payload.notification.body || "", payload.notification.image);
    }
  });
}

async function sendNativeNotification(title, body, imageUrl = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options = {
    body: body || "",
    icon: '../../assets/icons/icon-512.png',
    badge: '../../assets/icons/icon-512.png',
    image: imageUrl || null,
    vibrate: [100, 50, 100],
    data: { url: new URL('../feed/feed.html', location.href).href },
    actions: [
      { action: 'open', title: '👀 Guarda Feed' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title || "MeowGo", options);
    } else {
      new Notification(title || "MeowGo", options);
    }
  } catch (err) {
    console.warn("Errore notifica nativa:", err);
  }
}

renderNavbar(currentUser, 'profile');

function renderProfileHeader(user) {
  document.getElementById('user-display-name').innerText = user.username;
  document.getElementById('user-email-badge').innerText = user.email || '';
  document.getElementById('user-bio').innerText = user.bio ? user.bio : '';

  const avatarEl = document.getElementById('user-avatar');
  const photo = user.photoURL || user.avatarUrl;
  if (photo) {
    avatarEl.innerHTML = `<img src="${escapeHtml(photo)}" alt="Foto profilo di ${escapeHtml(user.username)}">`;
  } else {
    avatarEl.innerHTML = '😸';
  }
}

renderProfileHeader(currentUser);
updateUI();

// Mantiene profilo, XP e badge sincronizzati con il database
onValue(ref(db, `users/${currentUser.id}`), (snapshot) => {
  if (!snapshot.exists()) return;
  Object.assign(currentUser, snapshot.val());
  saveLocalUser(currentUser);
  renderProfileHeader(currentUser);
  updateUI();
}, (err) => console.warn('Profilo non leggibile:', err.message));

// Notifiche dirette (percorso notifications/{uid})
onChildAdded(ref(db, `notifications/${currentUser.id}`), (snapshot) => {
  const notif = snapshot.val();
  if (notif && notif.read !== true) {
    sendNativeNotification(notif.title || "MeowGo", notif.message || notif.body || "");
    update(ref(db, `notifications/${currentUser.id}/${snapshot.key}`), { read: true }).catch(() => {});
  }
}, (err) => console.warn('Notifiche non leggibili:', err.message));

const deleteModalEl = document.getElementById('deletePostModal');
const deleteModal = new bootstrap.Modal(deleteModalEl);
const settingsSidebarEl = document.getElementById('settings-sidebar');
const settingsSidebar = bootstrap.Offcanvas.getOrCreateInstance(settingsSidebarEl);

document.getElementById('open-delete-modal-btn').addEventListener('click', () => {
  settingsSidebar.hide();
  loadMyPosts();
  deleteModal.show();
});

const sidebarLogoutLink = document.getElementById('sidebar-logout-link');
if (sidebarLogoutLink) {
  sidebarLogoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

async function loadMyPosts() {
  const container = document.getElementById('my-posts-list');
  container.innerHTML = '<p class="text-center text-muted my-3">Caricamento post...</p>';

  try {
    const snapshot = await get(ref(db, POSTS_PATH));
    const myPosts = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const key in data) {
        if (isMyPost(data[key], currentUser) && data[key].deleted !== true) myPosts.push({ id: key, ...data[key] });
      }
    }

    if (myPosts.length === 0) {
      container.innerHTML = '<p class="text-center text-muted my-3">Non hai ancora pubblicato nessun post attivo.</p>';
      return;
    }

    container.innerHTML = '';
    myPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach(post => {
      const item = document.createElement('div');
      item.className = "d-flex align-items-center justify-content-between p-2 border rounded-3 bg-white shadow-sm";
      item.innerHTML = `
        <div class="d-flex align-items-center gap-3">
          <img src="${escapeHtml(post.imageUrl)}" class="my-post-thumb" alt="${escapeHtml(post.catName)}">
          <div>
            <h6 class="mb-0 fw-bold text-dark">${escapeHtml(post.catName)}</h6>
            <small class="text-muted"><i class="fa-regular fa-calendar-days me-1"></i>${escapeHtml(formatPostTimestamp(post))}</small>
          </div>
        </div>
        <button class="btn btn-outline-danger btn-sm rounded-3 ms-2" onclick="confirmAndDeletePost('${post.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>`;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-danger small my-3">${escapeHtml(err.message)}</p>`;
  }
}

window.confirmAndDeletePost = async function(postId) {
  const confirmed = confirm("Sei sicuro di cancellare questo post? Se lo cancelli diminuiranno anche i punti XP (100 XP).");
  if (!confirmed) return;

  try {
    await remove(ref(db, `${POSTS_PATH}/${postId}`));

    currentUser.xp = Math.max(0, (currentUser.xp || 0) - 100);
    currentUser.catsFound = Math.max(0, (currentUser.catsFound || 0) - 1);
    saveLocalUser(currentUser);
    await update(ref(db, `users/${currentUser.id}`), { xp: currentUser.xp, catsFound: currentUser.catsFound });

    updateUI();
    loadMyPosts();
  } catch (err) {
    alert("Errore durante l'eliminazione: " + err.message);
  }
};

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('cat-name-input');
  const photoInput = document.getElementById('cat-photo-input');
  const uploadBtn = document.getElementById('upload-btn');

  if (!photoInput.files || !photoInput.files[0] || !currentUser) return;

  const catName = nameInput.value.trim();
  const n = catName.toLowerCase();

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `Caricamento... ⏳`;

  try {
    const formData = new FormData();
    formData.append("image", photoInput.files[0]);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST", body: formData
    });
    const result = await response.json();

    if (!result.success) throw new Error("Errore durante il caricamento dell'immagine.");

    const imageUrl = result.data.url;
    const now = new Date();

    await set(push(ref(db, POSTS_PATH)), {
      uid: currentUser.id,
      author: currentUser.username,
      catName: catName,
      imageUrl: imageUrl,
      createdAt: Date.now(),
      date: now.toLocaleDateString('it-IT'),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (!currentUser.badges) currentUser.badges = {};

    let unlockedSecret = false;
    const rules = [
      { key: 'pelata', words: ['pelata', 'pelato', 'sfinge', 'sphynx', 'calvo', 'gatito'] },
      { key: 'maranza', words: ['maranza', 'tuta', 'tn'] },
      { key: 'police', words: ['poliziotto', 'sbirro', 'agente'] },
      { key: 'marescialla', words: ['marescialla', 'poliziotta'] },
      { key: 'pizza', words: ['pizza', 'margherita', 'pizzaiolo'] },
      { key: 'space', words: ['spazio', 'astro', 'alieno', 'ufo'] },
      { key: 'ninja', words: ['ninja', 'shinobi', 'ombra'] },
      { key: 'wizard', words: ['mago', 'wizard', 'magia', 'merlino'] },
      { key: 'royal', words: ['re', 'regina', 'principe', 'principessa'] },
      { key: 'pirate', words: ['pirata', 'ciurma', 'tesoro'] },
      { key: 'rocker', words: ['rock', 'metal', 'chitarra'] },
      { key: 'chef', words: ['chef', 'cucina', 'cuoco'] },
      { key: 'hero', words: ['hero', 'superman', 'batman', 'eroe'] },
      { key: 'hacker', words: ['hacker', 'code', 'cyber'] },
      { key: 'detective', words: ['sherlock', 'detective', 'spia'] },
      { key: 'vampire', words: ['vampiro', 'dracula', 'frenk'] },
      { key: 'ghost', words: ['fantasma', 'ghost', 'spettro'] },
      { key: 'zombie', words: ['zombie', 'nonmorto'] },
      { key: 'soccer', words: ['gol', 'calcio', 'pallone', 'inter', 'milan', 'juve'] },
      { key: 'artist', words: ['arte', 'pittore', 'picasso'] },
      { key: 'gamer', words: ['gamer', 'play', 'xbox', 'gaming'] }
    ];

    rules.forEach(rule => {
      if (rule.words.some(w => n.includes(w))) {
        currentUser.badges[rule.key] = true;
        unlockedSecret = true;
      }
    });

    currentUser.catsFound = (currentUser.catsFound || 0) + 1;
    currentUser.xp = (currentUser.xp || 0) + 100;
    saveLocalUser(currentUser);

    await update(ref(db, `users/${currentUser.id}`), {
      xp: currentUser.xp,
      catsFound: currentUser.catsFound,
      badges: currentUser.badges
    });

    confetti({ particleCount: unlockedSecret ? 120 : 50, spread: 70, origin: { y: 0.6 } });
    updateUI();

    if (unlockedSecret) {
      await sendNativeNotification("🏆 Badge Segreto Sbloccato!", `Hai sbloccato un badge speciale con ${catName}!`, imageUrl);
    } else {
      await sendNativeNotification("📸 Gatto Registrato!", `Hai aggiunto ${catName}! +100 XP guadagnati.`, imageUrl);
    }

    nameInput.value = '';
    photoInput.value = '';

    setTimeout(() => {
      window.location.href = '../feed/feed.html';
    }, 1000);

  } catch (err) {
    alert("Errore caricamento: " + err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `🌿 Carica Gatto`;
  }
});

function updateUI() {
  if (!currentUser) return;
  const xp = currentUser.xp || 0;
  const catsFound = currentUser.catsFound || 0;
  const level = Math.floor(xp / 1000) + 1;
  const b = currentUser.badges || {};

  document.getElementById('user-level').innerText = level;
  document.getElementById('user-xp').innerText = xp % 1000;
  document.getElementById('xp-bar').style.width = `${(xp % 1000) / 10}%`;

  document.getElementById('badge-first').classList.toggle('unlocked', catsFound >= 1);
  document.getElementById('badge-hunter').classList.toggle('unlocked', catsFound >= 5);
  document.getElementById('badge-master').classList.toggle('unlocked', catsFound >= 10);
  document.getElementById('badge-lvl2').classList.toggle('unlocked', level >= 2);

  const badgeKeys = ['pelata', 'maranza', 'police', 'marescialla', 'pizza', 'space', 'ninja', 'wizard', 'royal', 'pirate', 'rocker', 'chef', 'hero', 'hacker', 'detective', 'vampire', 'ghost', 'zombie', 'soccer', 'artist', 'gamer'];
  let countUnlockedSecrets = 0;

  badgeKeys.forEach(k => {
    const colEl = document.getElementById(`col-badge-${k}`);
    if (colEl) {
      const isUnlocked = !!b[k];
      colEl.classList.toggle('unlocked', isUnlocked);
      if (isUnlocked) countUnlockedSecrets++;
    }
  });

  const secretSection = document.getElementById('secret-badges-section');
  if (secretSection) {
    if (countUnlockedSecrets > 0) {
      secretSection.classList.remove('d-none');
    } else {
      secretSection.classList.add('d-none');
    }
  }
}
