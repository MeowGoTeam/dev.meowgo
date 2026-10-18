# MeowGo Beta v2 — stato della build

## Correzioni incluse in questa revisione
- Il pulsante “Registrati ora” è un vero pulsante HTML con listener del modulo, invece di dipendere da un handler inline.
- Aggiunta la funzione di recupero password Firebase.
- Aggiunti messaggi comprensibili per gli errori più comuni di Firebase Authentication e Database.
- Aggiunto l'invio della verifica email in fase di registrazione.
- Il profilo viene riparato quando l'account Auth esiste ma il record del profilo manca, se le regole lo consentono.
- Rimossa l'inizializzazione del modulo notifiche dalla pagina login.
- Aggiornata la cache del service worker.

## Stato reale: beta tecnica, non ancora release pubblica definitiva
I controlli statici locali non trovano riferimenti HTML locali mancanti e i file JavaScript superano `node --check`. Questo non equivale a un test end-to-end contro Firebase.

Il database fornito per `ogwoem` consente il modello `sightings`, `gardens/{uid}` e `notifications/{uid}`, mentre alcune funzioni legacy dell'app continuano a leggere/scrivere `cats`, `content/updates`, `content/credits` e `notifications/global` / `notifications/direct/{uid}`. Con le sole regole fornite, queste funzioni non sono ancora compatibili e possono essere negate. Per questo non è corretto presentare la build come pienamente pronta alla pubblicazione ufficiale finché non vengono migrati i percorsi e verificati i permessi.

## Configurazione necessaria su Firebase Console
1. Attivare Email/Password in Authentication.
2. Aggiungere il dominio di staging ai domini autorizzati.
3. Controllare il template di verifica email e il reset password.
4. Applicare regole testate e compatibili con lo schema dell'app; non usare regole pubbliche.
5. Testare registrazione, verifica email, login, reset password, logout, feed, pubblicazione/eliminazione post, profilo, giardino, calendario, notifiche e funzioni admin con account di prova.

## Distribuzione
Servire il sito via HTTPS su un host beta dedicato. Non aprire `index.html` direttamente da `file://` e non sostituire il sito ufficiale con questo ZIP finché i test end-to-end non sono superati.
\n\n## Correzione beta v3\n- Aggiunta pagina autonoma `meowgo/pages/login/registrati.html` con logica in `registrati.js`.\n- Il link Registrati dalla pagina di login apre ora la pagina dedicata.\n- Il recupero password è disponibile anche dalla pagina di registrazione: inserire prima l'email.\n- Testare su HTTPS e verificare le regole RTDB del progetto `ogwoem`; il salvataggio del profilo può fallire se le regole non corrispondono allo schema.\n
## Correzione beta v4 — caricamento dati
- Nuovo `meowgo/assets/js/core.js`: inizializza Firebase **Auth + Database** in modo condiviso e attende il ripristino della sessione prima di leggere i dati. Prima solo la pagina di login importava `firebase-auth`, quindi le altre pagine interrogavano il database senza utente autenticato (PERMISSION_DENIED).
- Post spostati da `cats` a `sightings` (con `uid` dell'autore); like e commenti legati all'uid. Il cambio nome/foto profilo si riflette su tutti i post.
- Notifiche dirette su `notifications/{uid}` (globali su `notifications/global`).
- Ricerca utenti, profilo pubblico, giardino, calendario, aggiornamenti, crediti e admin ora richiedono la sessione Firebase.
- Output HTML dei contenuti utente con escape (prima nomi/commenti venivano inseriti come HTML grezzo).
- Service worker `meowgo-beta-v4`, con strategia rete-prima-cache-poi (non serve più cache vuota a ogni modifica).
- Aggiunto `database.rules.json` (nella radice) coerente con questo schema: va pubblicato in Firebase Console → Realtime Database → Regole.

## Allineamento regole (v4.1)
- I post usano `userId` (non `uid`); il ban si legge da `bans/{uid}` (non più da `users/{uid}.bannedUntil`).
- `database.rules.json` estende le regole di `ogwoem` con: `imageUrl`, `author`, `date`, `time`, `deleted`, `likes`, `comments` nei post; `bio`, `photoURL`, `avatarUrl`, `fcmToken` negli utenti; `notifications/global`; `content/*` (scrittura solo admin). Eliminando un post l'XP può ora scendere (prima la regola lo vietava).
