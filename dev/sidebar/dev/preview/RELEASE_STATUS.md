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