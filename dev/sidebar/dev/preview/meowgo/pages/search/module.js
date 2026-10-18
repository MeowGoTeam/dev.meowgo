import { requireUser, loadUsers, escapeHtml } from "../../assets/js/core.js";

await requireUser();
const users = await loadUsers();
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  resultsContainer.innerHTML = '';
  if (q.length < 2) return;

  const matches = Object.values(users.byUid).filter(u => u.username.toLowerCase().includes(q));
  if (!matches.length) {
    resultsContainer.innerHTML = `<div class="glass-card p-4 text-center text-muted">Nessun utente trovato con questo nome.</div>`;
    return;
  }

  resultsContainer.innerHTML = matches.map(user => {
    const name = escapeHtml(user.username);
    const avatarHtml = user.avatar
      ? `<img src="${escapeHtml(user.avatar)}" class="search-avatar">`
      : `<div class="search-avatar">${escapeHtml(user.username.charAt(0).toUpperCase())}</div>`;
    return `
      <a href="../profile-view/profile-view.html?user=${encodeURIComponent(user.username)}" class="search-result-item shadow-sm">
        ${avatarHtml}
        <div>
          <div class="fw-bold fs-5">${name}</div>
          <small class="text-muted">Clicca per visitare il profilo</small>
        </div>
      </a>`;
  }).join('');
});
