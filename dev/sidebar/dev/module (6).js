import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, requireUser } from "../../assets/js/core.js";

await requireUser();

const listEl = document.getElementById('credits-list');

onValue(ref(db, 'content/credits'), (snapshot) => {
  if (!snapshot.exists()) {
    listEl.innerHTML = `<p class="text-center text-muted my-3">Nessun credito inserito ancora.</p>`;
    return;
  }

  const data = snapshot.val();
  const credits = Object.entries(data).map(([id, c]) => ({ id, ...c }));
  credits.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  listEl.innerHTML = '';
  credits.forEach(c => {
    const item = document.createElement('div');
    item.className = 'credit-item';
    item.innerHTML = `
      <i class="fa-solid ${escapeHtml(c.icon || 'fa-star')}"></i>
      <div>
        <div class="fw-bold">${escapeHtml(c.title || '')}</div>
        <div class="small text-muted">${escapeHtml(c.description || '')}</div>
      </div>
    `;
    listEl.appendChild(item);
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}
