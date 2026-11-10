import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, requireUser, renderNavbar, isMyPost, POSTS_PATH } from "../../assets/js/core.js";

const currentUser = await requireUser();
renderNavbar(currentUser, 'garden');
document.getElementById('garden-owner-name').innerText = currentUser.username;
// Le notifiche di sistema sono gestite da assets/js/notifications.js
listenToMyCats();

let myCatImageUrls = [];

function listenToMyCats() {
  onValue(ref(db, POSTS_PATH), (snapshot) => {
    myCatImageUrls = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((post) => {
        // Ignora post eliminati
        if (isMyPost(post, currentUser) && post.imageUrl && post.deleted !== true) {
          myCatImageUrls.push(post.imageUrl);
        }
      });
    }
    respawnGardenCats();
  }, (err) => console.error('Giardino non caricato:', err));
}

const catsCanvas = document.getElementById('cats-canvas');
const catsCtx = catsCanvas.getContext('2d');
const activeGardenCats = [];

function resizeCatsCanvas() {
  const box = document.getElementById('garden-container-box');
  if (box) {
    catsCanvas.width = box.clientWidth;
    catsCanvas.height = box.clientHeight;
  }
}

window.addEventListener('resize', () => {
  resizeCatsCanvas();
  respawnGardenCats();
});

class GardenCat {
  constructor(imgSrc) {
    this.radius = 34;
    const safeW = Math.max((catsCanvas.width || 300) - this.radius * 2, 50);
    const safeH = Math.max((catsCanvas.height || 300) - this.radius * 2, 50);

    this.x = this.radius + Math.random() * safeW;
    this.y = this.radius + Math.random() * safeH;
    this.speedX = (Math.random() - 0.5) * 1.5;
    if (Math.abs(this.speedX) < 0.4) this.speedX = 0.8;

    this.speedY = (Math.random() - 0.5) * 1.5;
    if (Math.abs(this.speedY) < 0.4) this.speedY = 0.8;

    this.img = new Image();
    this.img.crossOrigin = "anonymous";
    this.img.src = imgSrc;
  }

  update() {
    const cw = catsCanvas.width || 300;
    const ch = catsCanvas.height || 300;

    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x - this.radius < 10 || this.x + this.radius > cw - 10) this.speedX *= -1;
    if (this.y - this.radius < 10 || this.y + this.radius > ch - 10) this.speedY *= -1;
  }

  draw() {
    catsCtx.save();
    catsCtx.beginPath();
    catsCtx.ellipse(this.x, this.y + this.radius - 2, this.radius * 0.8, this.radius * 0.28, 0, 0, Math.PI * 2);
    catsCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
    catsCtx.fill();
    catsCtx.restore();

    catsCtx.save();
    catsCtx.beginPath();
    catsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    catsCtx.clip();

    if (this.img.complete && this.img.naturalWidth !== 0) {
      catsCtx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      catsCtx.fillStyle = '#b45309';
      catsCtx.fill();
    }
    catsCtx.restore();

    catsCtx.beginPath();
    catsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    catsCtx.strokeStyle = '#f59e0b';
    catsCtx.lineWidth = 3.5;
    catsCtx.stroke();
  }
}

function respawnGardenCats() {
  activeGardenCats.length = 0;
  if (!catsCanvas.width || !catsCanvas.height) resizeCatsCanvas();

  myCatImageUrls.forEach(url => {
    activeGardenCats.push(new GardenCat(url));
  });
}

function animate() {
  catsCtx.clearRect(0, 0, catsCanvas.width, catsCanvas.height);

  activeGardenCats.forEach(cat => {
    cat.update();
    cat.draw();
  });

  requestAnimationFrame(animate);
}

resizeCatsCanvas();
animate();
