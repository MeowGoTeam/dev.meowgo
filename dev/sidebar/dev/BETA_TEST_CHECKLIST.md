# Checklist di collaudo beta

- [ ] Dominio di staging distinto dal sito live
- [ ] Firebase Auth Email/Password attivo in `ogwoem`
- [ ] Regole RTDB verificate con test anonimo e autenticato
- [ ] Registrazione: niente password in `users` o `private`
- [ ] Email duplicata gestita da Firebase Auth
- [ ] Login errato e rate limit mostrano messaggi non sensibili
- [ ] Sessione persiste dopo refresh e logout invalida la sessione
- [ ] Feed, profilo, garden, calendario, ricerca, notifiche e admin testati uno per uno
- [ ] Tracker non invia richieste a `meowgo-default-rtdb.firebaseio.com`
- [ ] Upload immagini: limiti, autorizzazioni, chiavi e segnalazione contenuti verificati
- [ ] Informativa privacy, termini e regole community completati da responsabile competente
- [ ] Flusso di segnalazione e rimozione contenuti testato
- [ ] Backup e procedura di rollback verificati


## Test specifici registrazione (obbligatori)
- [ ] Aprire il sito tramite hosting HTTPS, non facendo doppio clic sui file HTML (`file://`).
- [ ] Premere “Registrati ora”: devono apparire il campo nickname e il titolo “Nuova registrazione”.
- [ ] Premere “Accedi” per tornare alla schermata di login.
- [ ] Registrare un account di test con email accessibile e password di almeno 6 caratteri.
- [ ] Verificare in Firebase Authentication che l'utente sia creato e in Realtime Database che esistano `users/{uid}` e `private/{uid}`.
- [ ] Se appare `auth/operation-not-allowed`, attivare Email/Password; se appare `auth/unauthorized-domain`, autorizzare il dominio; se appare `PERMISSION_DENIED`, correggere/testare le regole.
- [ ] Provare il recupero password e verificare l'email di verifica (anche spam).
- [ ] Ripetere il login e il logout e verificare che l'utente non resti autenticato dopo il logout.
