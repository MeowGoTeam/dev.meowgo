import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, requireUser } from "../../assets/js/core.js";

await requireUser();

const listEl = document.getElementById('updates-list');

onValue(ref(db, 'content/updates'), (snapshot) => {
  if (!snapshot.exists()) {
    listEl.innerHTML = `
      <p class="text-center text-muted my-3">Nessun aggiornamento pubblicato ancora.</p>
    `;
    return;
  }

  const data = snapshot.val();
  const updates = Object.entries(data).map(([id, u]) => ({ id, ...u }));

  // I più recenti in cima
  updates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  listEl.innerHTML = '';
  updates.forEach(u => {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.innerHTML = `
      ${u.version ? `<span class="update-version">${escapeHtml(u.version)}</span>` : ''}
      <h6 class="fw-bold mb-1">${escapeHtml(u.title || '')}</h6>
      <p class="small text-muted mb-0">${escapeHtml(u.description || '')}</p>
    `;
    listEl.appendChild(item);
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}
