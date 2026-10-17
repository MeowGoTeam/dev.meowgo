import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469"
};

const db = getDatabase(initializeApp(firebaseConfig));
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');

searchInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim().toLowerCase();
  resultsContainer.innerHTML = '';

  if (query.length < 2) return;

  const usersSnap = await get(ref(db, 'users'));
  if (usersSnap.exists()) {
    let found = false;
    Object.values(usersSnap.val()).forEach(user => {
      if (user.username && user.username.toLowerCase().includes(query)) {
        found = true;
        const avatarHtml = user.avatarUrl 
          ? `<img src="${user.avatarUrl}" class="search-avatar">` 
          : `<div class="search-avatar">${user.username.charAt(0).toUpperCase()}</div>`;

        resultsContainer.innerHTML += `
          <a href="../profile-view/profile-view.html?user=${encodeURIComponent(user.username)}" class="search-result-item shadow-sm">
            ${avatarHtml}
            <div>
              <div class="fw-bold fs-5">${user.username}</div>
              <small class="text-muted">Clicca per visitare il profilo</small>
            </div>
          </a>
        `;
      }
    });

    if (!found) {
      resultsContainer.innerHTML = `<div class="glass-card p-4 text-center text-muted">Nessun utente trovato con questo nome.</div>`;
    }
  }
});
