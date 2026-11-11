# MeowGo · Cloudflare Analytics Worker

Il pannello Admin usa questo Worker come backend. **Il token Cloudflare non è inserito nel sito né nel repository.**

## Cosa fa
- verifica la firma del Firebase ID token con le chiavi pubbliche Google (JWKS);
- controlla issuer, audience, scadenza e UID amministratore;
- accetta richieste solo dall'origine `https://dev.meowgo.it`;
- interroga Cloudflare GraphQL per richieste, byte, minacce, paesi e codici HTTP;
- non espone mai `CF_API_TOKEN` al browser.

## 1. Configura il token Cloudflare come Secret
Nel dashboard Cloudflare: **Workers & Pages → meowgo-analytics → Settings → Variables and Secrets**.
Aggiungi `CF_API_TOKEN` come **Secret** (non Text e non in `wrangler.toml`).
Il token deve avere i permessi di lettura Analytics per la zona `meowgo.it` (preferibilmente limitato a quella zona).

In alternativa da terminale, dentro questa cartella:
```bash
npm install
npx wrangler secret put CF_API_TOKEN
```
Incolla il token solo nel prompt del terminale Cloudflare/Wrangler, mai qui in chat o nel codice.

## 2. Pubblica il Worker
```bash
npm install
npx wrangler deploy
```
Cloudflare mostrerà un URL simile a:
`https://meowgo-analytics.<tuo-account>.workers.dev`

## 3. Collega il pannello
Apri `dev/index.html` e cerca:
```js
const CF_WORKER_URL = 'https://INSERISCI-NOME-WORKER.ACCOUNT.workers.dev';
```
Sostituisci il valore con l'URL effettivo del Worker, senza aggiungere `/analytics`.
Pubblica nuovamente il sito.

## 4. Verifica
- Accedi al pannello con l'account Firebase amministratore.
- Apri la dashboard: il riquadro Cloudflare carica le statistiche.
- Prova 24 ore, 7 giorni e 30 giorni.
- Se compare `401`, la sessione Firebase non è valida; se compare `403`, l'UID non coincide con `ADMIN_UID` o l'origine non è quella consentita; `502` indica un errore GraphQL/Cloudflare.

## Note sui dati
Il dataset `httpRequests1hGroups` è orario. Per il periodo di 24 ore il Worker filtra gli intervalli delle ultime 24 ore; per 7/30 giorni vengono mostrati i dati orari disponibili nel periodo. La somma dei valori `uniques` per bucket può contare più volte lo stesso visitatore in bucket differenti: va interpretata come somma delle unicità per intervallo, non come persone distinte nell'intero periodo. I valori `requests`, `bytes` e `threats` sono aggregati nel periodo.

CORS limita le origini del browser, ma **non è un sistema di autenticazione**: l'accesso effettivo è protetto dalla verifica del Firebase ID token e dal controllo dell'UID amministratore.
