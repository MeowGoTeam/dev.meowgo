
const FIREBASE_PROJECT_ID = "ogwoem";

const FIREBASE_DATABASE_URL =
  "https://ogwoem-default-rtdb.europe-west1.firebasedatabase.app";

const CLOUDFLARE_GRAPHQL_URL =
  "https://api.cloudflare.com/client/v4/graphql";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const ALLOWED_METHODS = "GET, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

let cachedJwks = null;
let jwksExpiresAt = 0;

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Vary": "Origin"
    }
  });
}

function getCorsOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN;

  if (!allowed) return null;

  return origin === allowed ? origin : null;
}

function base64UrlToBytes(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    base64 + "=".repeat((4 - base64.length % 4) % 4);

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    c => c.charCodeAt(0)
  );
}

function decodeJwtPart(value) {
  const bytes = base64UrlToBytes(value);

  return JSON.parse(
    new TextDecoder().decode(bytes)
  );
}

async function getFirebaseJwks() {
  if (cachedJwks && Date.now() < jwksExpiresAt) {
    return cachedJwks;
  }

  const response = await fetch(FIREBASE_JWKS_URL);

  if (!response.ok) {
    throw new Error(
      "Impossibile recuperare le chiavi Firebase."
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.keys) || data.keys.length === 0) {
    throw new Error(
      "Chiavi pubbliche Firebase non valide."
    );
  }

  cachedJwks = data.keys;
  jwksExpiresAt = Date.now() + 60 * 60 * 1000;

  return cachedJwks;
}

async function verifyFirebaseToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Token Firebase mancante.");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Token Firebase non valido.");
  }

  let header;
  let payload;

  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch {
    throw new Error("Token Firebase malformato.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error(
      "Algoritmo del token non supportato."
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error(
      "Token appartenente a un progetto Firebase diverso."
    );
  }

  if (
    payload.iss !==
    `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
  ) {
    throw new Error(
      "Emittente del token Firebase non valido."
    );
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("UID Firebase mancante.");
  }

  if (payload.sub.length > 128) {
    throw new Error("UID Firebase non valido.");
  }

  if (!payload.exp || payload.exp <= now) {
    throw new Error("Sessione Firebase scaduta.");
  }

  if (!payload.iat || payload.iat > now + 60) {
    throw new Error(
      "Data di emissione del token non valida."
    );
  }

  if (payload.auth_time && payload.auth_time > now + 60) {
    throw new Error(
      "Autenticazione Firebase non valida."
    );
  }

  const keys = await getFirebaseJwks();

  const jwk = keys.find(
    key => key.kid === header.kid
  );

  if (!jwk) {
    cachedJwks = null;
    jwksExpiresAt = 0;

    throw new Error(
      "Chiave di firma Firebase non trovata."
    );
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const signature = base64UrlToBytes(parts[2]);

  const signedData = new TextEncoder().encode(
    `${parts[0]}.${parts[1]}`
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    signedData
  );

  if (!valid) {
    throw new Error(
      "Firma del token Firebase non valida."
    );
  }

  return payload;
}

async function verifyAdmin(uid, token) {
  const url =
    `${FIREBASE_DATABASE_URL}/admins/${encodeURIComponent(uid)}.json` +
    `?auth=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      "Impossibile verificare i permessi amministratore su Firebase."
    );
  }

  const isAdmin = await response.json();

  if (isAdmin !== true) {
    throw new Error(
      "Accesso negato: utente non amministratore."
    );
  }

  return true;
}

function getPeriodRange(period) {
  const now = new Date();

  const ranges = {
    "24h": 1,
    "7d": 7,
    "30d": 30
  };

  const days = ranges[period];

  if (!days) {
    throw new Error(
      "Intervallo temporale non valido."
    );
  }

  const from = new Date(
    now.getTime() - days * 24 * 60 * 60 * 1000
  );

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    days
  };
}

async function fetchCloudflareAnalytics(env, range) {
  if (!env.CF_API_TOKEN) {
    throw new Error(
      "Secret CF_API_TOKEN non configurato."
    );
  }

  if (!env.CF_ZONE_ID) {
    throw new Error(
      "Variabile CF_ZONE_ID non configurata."
    );
  }

  const { from, to } = getPeriodRange(range);

  const query = `
    query ZoneAnalytics(
      $zoneTag: string!
      $start: Time!
      $end: Time!
    ) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1hGroups(
            limit: 1000
            filter: {
              datetime_geq: $start
              datetime_lt: $end
            }
            orderBy: [datetimeHour_ASC]
          ) {
            dimensions {
              datetimeHour
            }
            sum {
              requests
              bytes
              threats
              responseStatusMap {
                edgeResponseStatus
                requests
              }
            }
            uniq {
              uniques
            }
          }
        }
      }
    }
  `;

  const response = await fetch(
    CLOUDFLARE_GRAPHQL_URL,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: env.CF_ZONE_ID,
          start: from,
          end: to
        }
      })
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Cloudflare API HTTP ${response.status}.`
    );
  }

  if (!result) {
    throw new Error(
      "Risposta Cloudflare non valida."
    );
  }

  if (result.errors?.length) {
    const messages = result.errors
      .map(error => error.message)
      .filter(Boolean);

    throw new Error(
      "Errore GraphQL: " + messages.join(" | ")
    );
  }

  const zones = result.data?.viewer?.zones;

  if (!Array.isArray(zones) || zones.length === 0) {
    throw new Error(
      "Zona Cloudflare non trovata o non accessibile."
    );
  }

  const groups = zones[0].httpRequests1hGroups;

  if (!Array.isArray(groups)) {
    throw new Error(
      "Dati Analytics non disponibili."
    );
  }

  const totals = {
    requests: 0,
    bytes: 0,
    threats: 0,
    uniques: 0
  };

  const statusesMap = new Map();

  const series = groups.map(group => {
    const sum = group.sum || {};

    const requests = Number(sum.requests || 0);
    const bytes = Number(sum.bytes || 0);
    const threats = Number(sum.threats || 0);
    const uniques = Number(group.uniq?.uniques || 0);

    totals.requests += requests;
    totals.bytes += bytes;
    totals.threats += threats;

    // Somma degli unici orari: non rappresenta
    // visitatori distinti nell'intero intervallo.
    totals.uniques += uniques;

    for (const status of sum.responseStatusMap || []) {
      const code = String(
        status.edgeResponseStatus ?? "Sconosciuto"
      );

      statusesMap.set(
        code,
        (statusesMap.get(code) || 0) +
          Number(status.requests || 0)
      );
    }

    return {
      time: group.dimensions?.datetimeHour || null,
      requests
    };
  });

  const statuses = Array.from(statusesMap.entries())
    .map(([status, requests]) => ({
      status,
      requests
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  return {
    range,
    generatedAt: new Date().toISOString(),
    totals,
    series,
    countries: [],
    statuses
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = getCorsOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!origin) {
        return json(
          { error: "Origin non autorizzata." },
          403,
          ""
        );
      }

      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": ALLOWED_METHODS,
          "Access-Control-Allow-Headers": ALLOWED_HEADERS,
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (url.pathname === "/health") {
      return json(
        {
          status: "online",
          service: "MeowGo Analytics API"
        },
        200,
        origin || ""
      );
    }

    if (!origin) {
      return json(
        { error: "Origin non autorizzata." },
        403,
        ""
      );
    }

    if (request.method !== "GET") {
      return json(
        { error: "Metodo non consentito." },
        405,
        origin
      );
    }

    if (url.pathname !== "/analytics") {
      return json(
        { error: "Endpoint non trovato." },
        404,
        origin
      );
    }

    try {
      const authorization =
        request.headers.get("Authorization") || "";

      if (!authorization.startsWith("Bearer ")) {
        return json(
          { error: "Autenticazione richiesta." },
          401,
          origin
        );
      }

      const token = authorization.slice(7).trim();

      if (!token) {
        return json(
          { error: "Token Firebase mancante." },
          401,
          origin
        );
      }

      const user = await verifyFirebaseToken(token);

      await verifyAdmin(user.sub, token);

      const range =
        url.searchParams.get("range") ||
        url.searchParams.get("period") ||
        "24h";

      const analytics = await fetchCloudflareAnalytics(
        env,
        range
      );

      return json(analytics, 200, origin);

    } catch (error) {
      console.error(
        "[MeowGo Analytics]",
        error?.stack || error?.message || error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Errore interno del server.";

      return json(
        { error: message },
        500,
        origin
      );
    }
  }
};
