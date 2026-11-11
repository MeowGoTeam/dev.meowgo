# dev.meowgo

## Admin Firebase
Il pannello `dev/index.html` usa `dev/assets/js/admin-firebase.js`, indipendente dalla Preview ma collegato allo stesso progetto Firebase `ogwoem`. L’SSO del portale e Firebase Authentication sono due sessioni distinte: per verificare i permessi RTDB serve un utente Firebase autenticato il cui UID abbia valore booleano `true` in `/admins/{uid}`.
