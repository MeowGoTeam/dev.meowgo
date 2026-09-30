# MeowGo 🐾

PWA statica (HTML/CSS/JS + Firebase Realtime Database), pronta per GitHub Pages.

## Struttura

```
/
├── index.html                  redirect alla login (serve per GitHub Pages)
├── manifest.json               PWA  ┐
├── sw.js                       PWA  ├─ devono stare nella radice (scope)
├── firebase-messaging-sw.js    push ┘
├── assets/
│   ├── icons/                  icon-192.png, icon-512.png
│   └── js/                     notifications.js, tracker.js (condivisi)
├── pages/                      pagine pubbliche dell'app
│   └── <pagina>/               <pagina>.html + style.css + script.js / module.js
│       login, feed, garden, profile, calendar, search, profile-view,
│       modifica-profilo, crediti, aggiornamenti
└── admin/                      pagine staff (non linkate, noindex)
    ├── modifica-crediti/
    └── modifica-aggiornamenti/
```

Convenzione file in ogni cartella: `*.html` (struttura), `style.css` (stili),
`script.js` (JS classico), `module.js` (JS `type="module"`, con gli import Firebase).

## Pubblicazione su GitHub Pages
Settings → Pages → Deploy from a branch → `main` / root.
L'app parte da `https://<utente>.github.io/<repo>/`.
Admin: `.../admin/modifica-crediti/modifica-crediti.html` e `.../admin/modifica-aggiornamenti/modifica-aggiornamenti.html`.
