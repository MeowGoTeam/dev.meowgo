// Firebase dedicato al pannello amministratore MeowGo.
// Separato dalla Preview: usa lo stesso progetto/database ma un'app Firebase nominata.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBvptRA3ls2WZkiFaAsBqcmyxYtq4IZkXg",
  authDomain: "ogwoem.firebaseapp.com",
  databaseURL: "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ogwoem",
  storageBucket: "ogwoem.firebasestorage.app",
  messagingSenderId: "56252958412",
  appId: "1:56252958412:web:59b451972a5d8126332469",
  measurementId: "G-GE1WZ5JQPV"
};

const APP_NAME = "meowgo-admin";
const existing = getApps().find(app => app.name === APP_NAME);
export const app = existing || initializeApp(firebaseConfig, APP_NAME);
export const db = getDatabase(app);
export const auth = getAuth(app);
auth.languageCode = "it";
