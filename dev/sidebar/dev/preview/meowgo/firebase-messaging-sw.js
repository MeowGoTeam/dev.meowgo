importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Legge esattamente ciò che invii dal pannello (senza testi di default)
  const title = payload.notification?.title || "MeowGo";
  const body = payload.notification?.body || "";
  
  self.registration.showNotification(title, {
    body: body,
    icon: './assets/icons/icon-512.png',
    badge: './assets/icons/icon-512.png',
    data: { url: payload.notification?.click_action || './pages/feed/feed.html' }
  });
});
