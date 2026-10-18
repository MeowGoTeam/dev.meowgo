# MeowGo — pacchetto beta separato

Questa cartella è una copia di test; non sovrascrive il progetto originale. Pubblicarla su un host di staging separato (es. beta.meowgo.it) e non direttamente sul dominio principale.

## Modifiche incluse
- Configurazione Firebase web aggiornata al progetto `ogwoem` nei file in cui era presente la configurazione del progetto precedente.
- Login/registrazione usa Firebase Authentication; le password non vengono più lette, confrontate o scritte nel nodo `users`.
- Il profilo pubblico iniziale è salvato in `users/{uid}` e l’email in `private/{uid}`.
- Tracker di presenza disattivato e rimosso da pagina e cache del service worker.
- Cache PWA versionata come `meowgo-beta-v1`.
- Pagine privacy/termini/regole community create come BOZZE chiaramente non definitive.

## Registrazione e accesso aggiornati
- Il pulsante di passaggio tra accesso e registrazione è gestito dal modulo JavaScript, non da un handler inline.
- Aggiunti messaggi chiari per gli errori Firebase più comuni, recupero password e invio di verifica email.
- Il modulo notifiche non viene inizializzato nella pagina di login: evita richieste di permesso premature e un'inizializzazione Firebase non necessaria.
- Gli errori di scrittura del profilo vengono mostrati all'utente invece di essere ignorati.

## Prima di provare la beta
1. In Firebase Console del progetto `ogwoem`, attivare Authentication → Email/Password e autorizzare il dominio di staging.
2. In Firebase Console, controllare anche che Email/Password sia attivo, che l’URL di reimpostazione password sia configurato e che il dominio beta sia autorizzato.
3. Verificare le regole Realtime Database: il codice di registrazione richiede scrittura in `users/{uid}` e `private/{uid}`. Non usare regole pubbliche `.read: true` o `.write: true`.
4. Fare un test con un account fittizio: registrazione, logout, login, ricarica pagina, reset password e accesso negato da utente non autenticato.
5. Controllare la console browser e Firebase Rules Simulator.
6. Testare ogni funzione: il resto dell’app contiene codice legacy che usa schemi dati precedenti (per esempio feed/notifiche/profilo) e non è garantito compatibile con le nuove regole. Alcune funzioni possono fallire finché non vengono migrate e testate.
7. Migrare i dati dal progetto precedente solo con uno script controllato/Admin SDK e backup. Non copiare le vecchie password in chiaro nel nuovo database; gli utenti legacy dovranno usare un flusso di reset o migrazione assistita.
8. Le pagine legali sono bozze: completare titolare, contatti, basi giuridiche, conservazione, destinatari, diritti, età minima e procedura di segnalazione prima di invitare tester esterni.
9. La chiave Firebase web è visibile per design, ma va limitata con le restrizioni API/referrer appropriate. Le chiavi ImgBB presenti in codice client vanno ruotate e la strategia di upload rivalutata.

## Importante
Questa build è un pacchetto beta di migrazione, non una certificazione di conformità legale e non una release pronta per produzione. Non distribuire su `meowgo.it` finché i test sopra non sono superati. Le regole database non vengono pubblicate automaticamente da questo archivio.
