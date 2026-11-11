# MeowGo · Cloudflare Analytics Worker

Il pannello Admin usa questo Worker come backend. Il token Cloudflare resta esclusivamente nei Secrets del Worker e non viene mai inserito nel sito.

## Sicurezza e autorizzazioni
- verifica firma, issuer, audience e scadenza del Firebase ID token;
- controlla in tempo reale `admins/{uid}` nel database Firebase;
- autorizza tutti gli account per cui `admins/{uid}` vale esattamente `true` (non usa un singolo `ADMIN_UID`);
- accetta richieste browser solo da `https://dev.meowgo.it`;
- interroga Cloudflare GraphQL senza esporre `CF_API_TOKEN` al browser.

## 1. Secret Cloudflare
Nel dashboard Cloudflare: **Workers & Pages → meowgo-analytics-api → Settings → Variables and Secrets**.
Verifica che `CF_API_TOKEN` esista come **Secret**. Se manca, aggiungilo come Secret. Il token deve avere permessi di lettura Analytics per la zona `meowgo.it`.

Da terminale, in questa cartella:
```bash
npm install
npx wrangler secret put CF_API_TOKEN
```
Incolla il token solo nel prompt locale Cloudflare/Wrangler, mai nel codice o in chat.

## 2. Pubblicazione
```bash
npm install
npx wrangler deploy
```
Il Worker è configurato con il nome `meowgo-analytics-api`, quindi l'URL previsto è:
`https://meowgo-analytics-api.antoscugnizzu.workers.dev`

## 3. Variabili
`wrangler.toml` contiene già:
- `CF_ZONE_ID`
- `FIREBASE_DATABASE_URL`
- `ALLOWED_ORIGIN`

Non aggiungere `ADMIN_UID`: l'autorizzazione viene verificata dinamicamente sul nodo Firebase `/admins/{uid}`. Le regole RTDB devono consentire all'utente autenticato di leggere il proprio nodo `admins/{uid}` (e restituire `true` per gli amministratori).

## 4. Verifica
- `/health` deve restituire `{"status":"online","service":"MeowGo Analytics API"}`.
- Accedi al pannello con un account amministratore Firebase.
- Apri la dashboard e prova 24 ore, 7 giorni e 30 giorni.
- `401` indica token/sessione non valida; `403` indica account non amministratore o origine non consentita; `502` indica un errore nella verifica Firebase o nella query Cloudflare.

## Nota sui dati
Le statistiche sono aggregate da intervalli orari. La somma di `uniques` dei singoli intervalli può contare più volte lo stesso visitatore in intervalli diversi: il dato va quindi letto come somma delle unicità orarie, non come numero esatto di persone distinte nell'intero periodo.
