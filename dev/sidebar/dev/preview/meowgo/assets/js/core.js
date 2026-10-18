// MeowGo core: inizializzazione Firebase condivisa da tutte le pagine.
// IMPORTANTE: ogni pagina deve importare l'Auth tramite questo file, altrimenti
// Realtime Database invia le richieste SENZA utente autenticato (PERMISSION_DENIED).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
auth.languageCode = 'it';

export const USER_KEY = 'meowgo_test_user';
export const POSTS_PATH = 'sightings';   // nodo dei post (prima era "cats")

const url = (p) => new URL(p, import.meta.url).href;
export const LOGIN_URL = url('../../pages/login/login.html');
export const FEED_URL = url('../../pages/feed/feed.html');

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Aspetta che Firebase Auth abbia ripristinato la sessione (la prima callback).
export function waitForAuth() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}

function clearLocalSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('meowgo_uid');
}

export async function logout() {
  try { await signOut(auth); } catch (e) { console.warn(e); }
  clearLocalSession();
  window.location.href = LOGIN_URL;
}

function showBanScreen(reason) {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;font-family:sans-serif;">
      <h1 style="color:#dc2626;font-size:2.5rem;font-weight:bold;">⛔ ACCOUNT BLOCCATO</h1>
      <p style="font-size:1.2rem;color:#4b5563;">Sei stato sospeso da MeowGo.</p>
      <p><strong>Motivo:</strong> ${escapeHtml(reason || 'Violazione delle regole della community')}</p>
      <a href="${LOGIN_URL}" style="margin-top:12px;padding:10px 18px;background:#f59e0b;border-radius:8px;color:#000;text-decoration:none;font-weight:bold;">Torna alla Login</a>
    </div>`;
}

// Restituisce l'utente corrente (profilo da users/{uid}) oppure reindirizza al login.
export async function requireUser() {
  const fbUser = await waitForAuth();
  if (!fbUser) {
    clearLocalSession();
    window.location.replace(LOGIN_URL);
    return new Promise(() => {}); // ferma l'esecuzione della pagina
  }

  const uid = fbUser.uid;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch (_) {}
  if (saved.id && saved.id !== uid) saved = {};

  let profile = null;
  try {
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      profile = snap.val();
    } else {
      // Account Auth senza profilo: lo ricreo.
      profile = {
        username: saved.username || fbUser.displayName || (fbUser.email || 'utente').split('@')[0],
        xp: 0, catsFound: 0, badges: {}
      };
      try { await set(ref(db, `users/${uid}`), profile); } catch (e) { console.warn('Profilo non creato:', e); }
    }
  } catch (e) {
    console.error('Lettura profilo non riuscita (controlla le regole del database):', e);
  }

  if (profile && profile.bannedUntil) {
    const banned = profile.bannedUntil === 'indefinite' || new Date(profile.bannedUntil) > new Date();
    if (banned) {
      try { await signOut(auth); } catch (_) {}
      clearLocalSession();
      showBanScreen(profile.banReason);
      return new Promise(() => {});
    }
  }

  const user = {
    ...saved,
    ...(profile || {}),
    id: uid,
    uid,
    email: fbUser.email || saved.email || '',
    username: (profile && profile.username) || saved.username || (fbUser.email || 'utente').split('@')[0],
    xp: Number((profile && profile.xp) ?? saved.xp ?? 0) || 0,
    catsFound: Number((profile && profile.catsFound) ?? saved.catsFound ?? 0) || 0,
    badges: (profile && profile.badges) || saved.badges || {}
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('meowgo_uid', uid);
  return user;
}

export function saveLocalUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Mappa degli utenti: per uid e per username.
export async function loadUsers() {
  const byUid = {}, byName = {};
  try {
    const snap = await get(ref(db, 'users'));
    if (snap.exists()) {
      Object.entries(snap.val()).forEach(([uid, u]) => {
        if (!u || !u.username) return;
        const entry = { uid, username: u.username, avatar: u.avatarUrl || u.photoURL || null, bio: u.bio || '' };
        byUid[uid] = entry;
        byName[u.username] = entry;
      });
    }
  } catch (e) {
    console.error('Impossibile leggere users:', e);
  }
  return { byUid, byName };
}

// Autore di un post: usa l'uid (così il cambio nome si riflette ovunque), con fallback sul nome salvato.
export function postAuthor(post, users) {
  const u = (post.uid && users.byUid[post.uid]) || users.byName[post.author] || null;
  return {
    uid: post.uid || (u && u.uid) || null,
    name: (u && u.username) || post.author || 'Utente Sconosciuto',
    avatar: (u && u.avatar) || null
  };
}

export function isMyPost(post, user) {
  return post.uid ? post.uid === user.id : post.author === user.username;
}

export function formatPostTimestamp(post) {
  if (post.date && post.time) return `${post.date} - ${post.time}`;
  if (post.createdAt) {
    const d = new Date(post.createdAt);
    return `${d.toLocaleDateString('it-IT')} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return post.time || '';
}

export function renderNavbar(user, activePage) {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;
  const cls = (page, inactive) => `nav-link fw-bold ${activePage === page ? 'text-warning' : inactive}`;
  navLinks.innerHTML = `
    <li class="nav-item"><a class="${cls('feed', 'text-dark')}" href="${FEED_URL}"><i class="fa-solid fa-newspaper"></i> Feed</a></li>
    <li class="nav-item"><a class="${cls('garden', 'text-success')}" href="${url('../../pages/garden/garden.html')}"><i class="fa-solid fa-tree"></i> MeowGarden</a></li>
    <li class="nav-item"><a class="${cls('profile', 'text-dark')}" href="${url('../../pages/profile/profile.html')}"><i class="fa-solid fa-user"></i> Profilo (${escapeHtml(user.username)})</a></li>
    <li class="nav-item"><a class="nav-link fw-bold text-danger" href="#" id="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>`;
  document.getElementById('logout-link')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}
