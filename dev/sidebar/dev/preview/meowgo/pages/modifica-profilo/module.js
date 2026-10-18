import { ref, get, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, requireUser, saveLocalUser, escapeHtml, POSTS_PATH } from "../../assets/js/core.js";

const IMGBB_API_KEY = "82fcd1a9192375d6c456c52e7979599c";

let currentUser = await requireUser();

const usernameInput = document.getElementById('username-input');
const bioInput = document.getElementById('bio-input');
const bioCount = document.getElementById('bio-count');
const emailDisplay = document.getElementById('email-display');
const avatarPreview = document.getElementById('avatar-preview');
const photoInput = document.getElementById('photo-input');
const saveBtn = document.getElementById('save-btn');
const feedbackBox = document.getElementById('feedback-box');

let newPhotoFile = null;

function renderAvatar(photoURL) {
  avatarPreview.innerHTML = photoURL
    ? `<img src="${escapeHtml(photoURL)}" alt="Anteprima foto profilo">`
    : '😸';
}

function fillForm(user) {
  usernameInput.value = user.username || '';
  bioInput.value = user.bio || '';
  bioCount.innerText = (user.bio || '').length;
  emailDisplay.value = user.email || '';
  renderAvatar(user.photoURL || user.avatarUrl || '');
}

fillForm(currentUser);

bioInput.addEventListener('input', () => {
  bioCount.innerText = bioInput.value.length;
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  newPhotoFile = file;
  renderAvatar(URL.createObjectURL(file));
});

function showFeedback(message, type = 'success') {
  feedbackBox.innerHTML = `
    <div class="alert alert-${type} rounded-3 py-2 small" role="alert">${escapeHtml(message)}</div>
  `;
}

document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newUsername = usernameInput.value.trim();
  const newBio = bioInput.value.trim();
  const oldUsername = currentUser.username;

  if (!/^[A-Za-z0-9_ .-]{2,30}$/.test(newUsername)) {
    showFeedback('Il nome utente deve avere 2–30 caratteri: lettere, numeri, spazi, punto, trattino o underscore.', 'danger');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Salvataggio... ⏳';

  try {
    let photoURL = currentUser.photoURL || currentUser.avatarUrl || '';

    // Se l'utente ha scelto una nuova foto, la carica su ImgBB
    if (newPhotoFile) {
      const formData = new FormData();
      formData.append('image', newPhotoFile);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST', body: formData
      });
      const result = await response.json();
      if (!result.success) throw new Error("Errore durante il caricamento della foto profilo.");
      photoURL = result.data.url;
    }

    // Aggiorna i dati utente sul database
    const updates = {
      username: newUsername,
      bio: newBio,
      photoURL: photoURL
    };
    await update(ref(db, `users/${currentUser.id}`), updates);

    // Allinea il nome salvato nei miei post (la lettura usa comunque l'uid)
    if (newUsername !== oldUsername) {
      try {
        const mine = await get(query(ref(db, POSTS_PATH), orderByChild('uid'), equalTo(currentUser.id)));
        if (mine.exists()) {
          const multiUpdate = {};
          Object.keys(mine.val()).forEach(k => { multiUpdate[`${POSTS_PATH}/${k}/author`] = newUsername; });
          await update(ref(db), multiUpdate);
        }
      } catch (e) { console.warn('Nome nei post non aggiornato (non bloccante):', e.message); }
    }

    currentUser = { ...currentUser, ...updates };
    saveLocalUser(currentUser);
    newPhotoFile = null;

    showFeedback('Profilo aggiornato con successo! ✅', 'success');

    setTimeout(() => {
      window.location.href = '../profile/profile.html';
    }, 900);

  } catch (err) {
    showFeedback('Errore: ' + err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salva modifiche';
  }
});
