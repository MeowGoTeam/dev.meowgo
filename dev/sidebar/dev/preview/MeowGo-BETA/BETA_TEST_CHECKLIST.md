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
