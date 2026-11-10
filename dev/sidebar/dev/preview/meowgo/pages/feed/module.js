import { ref, get, set, update, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, requireUser, renderNavbar, loadUsers, postAuthor, formatPostTimestamp, escapeHtml, POSTS_PATH } from "../../assets/js/core.js";

let selectedPostForShare = null;
let shareModalInstance = null;
let usersCache = { byUid: {}, byName: {} };
let catList = [];
const openComments = new Set();

const currentUser = await requireUser();
renderNavbar(currentUser, 'feed');
initFeed();
setupNotificationsListener(currentUser);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../../sw.js').catch(err => console.warn('Service Worker non registrato:', err));
}

async function initFeed() {
  usersCache = await loadUsers();
  listenToFeed();
}

function setupNotificationsListener(user) {
  const dismissed = () => JSON.parse(localStorage.getItem('dismissed_globals') || '[]');

  onValue(ref(db, 'notifications/global'), (snapshot) => {
    if (!snapshot.exists()) return;
    const globals = snapshot.val();
    const seen = dismissed();
    for (const id in globals) {
      if (!seen.includes(id)) {
        showSystemNotification(globals[id].title || 'MeowGo', globals[id].message || globals[id].body || 'Nuova notifica');
        seen.push(id);
        localStorage.setItem('dismissed_globals', JSON.stringify(seen));
      }
    }
  }, (err) => console.warn('Notifiche globali non leggibili:', err.message));

  onValue(ref(db, `notifications/${user.id}`), async (snapshot) => {
    if (!snapshot.exists()) return;
    const directs = snapshot.val();
    for (const id in directs) {
      const n = directs[id];
      showSystemNotification(n.title || 'MeowGo', n.message || n.body || 'Hai un nuovo messaggio');
      try { await remove(ref(db, `notifications/${user.id}/${id}`)); } catch (_) {}
    }
  }, (err) => console.warn('Notifiche dirette non leggibili:', err.message));
}

function showSystemNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        icon: '../../assets/icons/icon-192.png',
        badge: '../../assets/icons/icon-192.png',
        vibrate: [100, 50, 100]
      });
    });
  }
}

function listenToFeed() {
  const container = document.getElementById('feed-container');
  onValue(ref(db, POSTS_PATH), (snapshot) => {
    container.innerHTML = '';
    catList = [];

    if (!snapshot.exists()) {
      container.innerHTML = '<div class="glass-card p-4 text-center text-muted">Nessun avvistamento ancora. Sii il primo a pubblicarne uno! 🐱</div>';
      return;
    }

    const data = snapshot.val();
    catList = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    catList.forEach((post) => {
      if (post.deleted === true || !post.imageUrl) return;

      const author = postAuthor(post, usersCache);
      const safeName = escapeHtml(author.name);
      const avatarHtml = author.avatar
        ? `<img src="${escapeHtml(author.avatar)}" class="post-avatar me-2" alt="${safeName}">`
        : `<div class="post-avatar-placeholder me-2">${escapeHtml(author.name.charAt(0).toUpperCase())}</div>`;

      const likesMap = post.likes || {};
      const likesCount = Object.keys(likesMap).length;
      const isLiked = !!likesMap[currentUser.id];
      const commentsMap = post.comments || {};
      const commentKeys = Object.keys(commentsMap).sort((a, b) => (commentsMap[a].createdAt || 0) - (commentsMap[b].createdAt || 0));
      const catName = escapeHtml(post.catName || 'Senza nome');

      const commentsHtml = commentKeys.length
        ? commentKeys.map(key => {
            const c = commentsMap[key];
            const mine = c.uid ? c.uid === currentUser.id : c.author === currentUser.username;
            return `<div class="comment-bubble">
              <div><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</div>
              ${mine ? `<button class="btn btn-link text-danger p-0 ms-auto" onclick="deleteComment('${post.id}', '${key}')" title="Elimina commento"><i class="fa-solid fa-trash-can fa-sm"></i></button>` : ''}
            </div>`;
          }).join('')
        : '<div class="text-muted small fst-italic">Nessun commento ancora. Sii il primo a commentare con un tocco!</div>';

      const quick = ['❤️ Adorabile!', '📸 Che foto!', '👋 Ciao micio!', '😻', '😼', '😹'];
      const quickHtml = quick.map(t => `<button class="btn btn-sm btn-outline-secondary rounded-pill" data-post="${post.id}" data-text="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');

      const card = document.createElement('div');
      card.className = 'glass-card overflow-hidden';
      card.id = `post-${post.id}`;
      card.innerHTML = `
        <div class="p-3 d-flex align-items-center justify-content-between border-bottom">
          <a class="d-flex align-items-center text-decoration-none" href="../profile-view/profile-view.html?user=${encodeURIComponent(author.name)}">
            ${avatarHtml}
            <div><h6 class="mb-0 fw-bold text-dark">${safeName}</h6></div>
          </a>
          <span class="small text-muted"><i class="fa-regular fa-calendar-days me-1"></i>${escapeHtml(formatPostTimestamp(post))}</span>
        </div>
        <img src="${escapeHtml(post.imageUrl)}" class="cat-post-img" alt="${catName}">
        <div class="p-3">
          <div class="d-flex align-items-center gap-3 mb-2">
            <button class="btn btn-link p-0 text-decoration-none btn-like fs-4 ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
              <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <span class="fw-bold text-dark">${likesCount}</span>
            <button class="btn btn-link p-0 text-decoration-none btn-comment fs-4 ms-2" onclick="toggleCommentsSection('${post.id}')" title="Commenti">
              <i class="fa-regular fa-comment"></i>
            </button>
            <span class="fw-bold text-dark">${commentKeys.length}</span>
            <button class="btn btn-link p-0 text-decoration-none btn-share fs-4 ms-auto" onclick="openShareModal('${post.id}')" title="Condividi">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
          </div>
          <h5 class="fw-bold text-dark mb-2">${catName}</h5>
          <div id="comments-box-${post.id}" class="${openComments.has(post.id) ? '' : 'd-none'} mt-3 pt-3 border-top">
            <div class="fw-bold small text-muted mb-2"><i class="fa-solid fa-comments me-1"></i> Commenti della community</div>
            <div class="mb-3" style="max-height: 200px; overflow-y: auto;">${commentsHtml}</div>
            <div class="small text-muted mb-1">Scegli un commento rapido:</div>
            <div class="d-flex flex-wrap gap-1">${quickHtml}</div>
          </div>
        </div>`;
      container.appendChild(card);
    });
  }, (err) => {
    console.error('Errore lettura feed:', err);
    container.innerHTML = `<div class="alert alert-danger">Impossibile caricare i post (${escapeHtml(err.code || err.message)}). Controlla le regole del database.</div>`;
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-post][data-text]');
    if (btn) postComment(btn.dataset.post, btn.dataset.text);
  });
}

window.openShareModal = (postId) => {
  selectedPostForShare = catList.find(p => p.id === postId);
  if (!selectedPostForShare) return;
  if (!shareModalInstance) shareModalInstance = new bootstrap.Modal(document.getElementById('shareModal'));
  shareModalInstance.show();
};

window.toggleLike = async function (postId) {
  const likeRef = ref(db, `${POSTS_PATH}/${postId}/likes/${currentUser.id}`);
  try {
    const snap = await get(likeRef);
    if (snap.exists()) await remove(likeRef);
    else await set(likeRef, true);
  } catch (err) { alert('Impossibile aggiornare il like: ' + err.message); }
};

window.toggleCommentsSection = function (postId) {
  const box = document.getElementById(`comments-box-${postId}`);
  if (!box) return;
  box.classList.toggle('d-none');
  if (box.classList.contains('d-none')) openComments.delete(postId); else openComments.add(postId);
};

async function postComment(postId, text) {
  openComments.add(postId);
  try {
    await push(ref(db, `${POSTS_PATH}/${postId}/comments`), {
      uid: currentUser.id,
      author: currentUser.username,
      text,
      createdAt: Date.now()
    });
  } catch (err) { alert('Impossibile pubblicare il commento: ' + err.message); }
}

window.deleteComment = async function (postId, commentId) {
  try { await remove(ref(db, `${POSTS_PATH}/${postId}/comments/${commentId}`)); }
  catch (err) { alert('Impossibile eliminare il commento: ' + err.message); }
};

window.sharePostLink = async function () {
  if (!selectedPostForShare) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}#post-${selectedPostForShare.id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `MeowGo - ${selectedPostForShare.catName}`,
        text: `Guarda questo post di ${postAuthor(selectedPostForShare, usersCache).name} su MeowGo!`,
        url: shareUrl,
      });
    } catch (err) {
      console.log('Condivisione annullata');
    }
  } else {
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copiato negli appunti!');
  }
  shareModalInstance.hide();
};

window.sharePostImage = async function () {
  if (!selectedPostForShare) return;

  // Popola il template di condivisione pulito (senza commenti)
  document.getElementById('card-share-author').textContent = postAuthor(selectedPostForShare, usersCache).name;
  document.getElementById('card-share-date').textContent = formatPostTimestamp(selectedPostForShare);
  document.getElementById('card-share-name').textContent = selectedPostForShare.catName;
  document.getElementById('card-share-likes').textContent = Object.keys(selectedPostForShare.likes || {}).length;

  const imgTarget = document.getElementById('card-share-img');
  imgTarget.src = selectedPostForShare.imageUrl;

  // Attende il caricamento dell'immagine nel DOM nascosto
  imgTarget.onload = async () => {
    const shareTarget = document.getElementById('share-card-target');
    const canvas = await html2canvas(shareTarget, { useCORS: true, allowTaint: true, scale: 2 });

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `${selectedPostForShare.catName}_meowgo.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: selectedPostForShare.catName,
            text: `Post di ${postAuthor(selectedPostForShare, usersCache).name} su MeowGo!`,
          });
        } catch (e) {
          console.log('Condivisione immagine annullata');
        }
      } else {
        // Fallback: download dell'immagine
        const link = document.createElement('a');
        link.download = `${selectedPostForShare.catName}_meowgo.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
      shareModalInstance.hide();
    });
  };
};
