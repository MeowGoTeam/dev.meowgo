import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_PROJECT_ID = "ogwoem";
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const json = (data, status = 200, origin = "") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin"
  }
});

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

async function verifyFirebaseAdmin(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Autenticazione richiesta.");
  const token = header.slice(7);
  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
    algorithms: ["RS256"]
  });
  if (!payload.sub || payload.sub !== env.ADMIN_UID) {
    throw new Error("Utente autenticato ma non autorizzato.");
  }
  return payload.sub;
}

const dateISO = d => d.toISOString().slice(0, 10);
const gql = `query ZoneAnalytics($zone: String!, $from: Date!, $to: Date!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequests1hGroups(limit: 1000, filter: { date_geq: $from, date_leq: $to }, orderBy: [datetimeHour_ASC]) {
        dimensions { datetimeHour }
        sum {
          requests
          bytes
          threats
          countryMap { clientCountryName requests }
          responseStatusMap { edgeResponseStatus requests }
        }
        uniq { uniques }
      }
    }
  }
}`;

async function fetchAnalytics(env, period) {
  const now = new Date();
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  const from = new Date(now.getTime() - (days - 1) * 86400000);
  const variables = { zone: env.CF_ZONE_ID, from: dateISO(from), to: dateISO(now) };
  const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: gql, variables })
  });
  const body = await resp.json();
  if (!resp.ok || body.errors?.length) {
    throw new Error(body.errors?.map(e => e.message).join("; ") || `Cloudflare API HTTP ${resp.status}`);
  }
  let rows = body.data?.viewer?.zones?.[0]?.httpRequests1hGroups || [];
  if (period === "24h") {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    rows = rows.filter(row => {
      const stamp = Date.parse(row.dimensions?.datetimeHour || "");
      return Number.isFinite(stamp) && stamp >= cutoff && stamp <= Date.now();
    });
  }
  const totals = { requests: 0, bytes: 0, threats: 0, uniques: 0 };
  const countries = new Map();
  const statuses = new Map();
  const series = rows.map(row => {
    const sum = row.sum || {};
    totals.requests += Number(sum.requests || 0);
    totals.bytes += Number(sum.bytes || 0);
    totals.threats += Number(sum.threats || 0);
    totals.uniques += Number(row.uniq?.uniques || 0);
    for (const item of sum.countryMap || []) {
      const key = item.clientCountryName || "Sconosciuto";
      countries.set(key, (countries.get(key) || 0) + Number(item.requests || 0));
    }
    for (const item of sum.responseStatusMap || []) {
      const key = String(item.edgeResponseStatus ?? "N/D");
      statuses.set(key, (statuses.get(key) || 0) + Number(item.requests || 0));
    }
    return {
      time: row.dimensions?.datetimeHour || "",
      requests: Number(sum.requests || 0)
    };
  });
  // Distinct IP uniques are additive only as an approximation across buckets;
  // label explicitly in the UI as Cloudflare's aggregated unique count.
  return {
    period,
    from: variables.from,
    to: variables.to,
    totals,
    series,
    countries: [...countries].map(([country, requests]) => ({ country, requests })).sort((a,b) => b.requests-a.requests).slice(0, 8),
    statuses: [...statuses].map(([status, requests]) => ({ status, requests })).sort((a,b) => b.requests-a.requests).slice(0, 8)
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://dev.meowgo.it";
    if (origin && origin !== allowedOrigin) return new Response("Origin non consentita", { status: 403 });
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/analytics") {
      return json({ error: "Endpoint non trovato." }, 404, allowedOrigin);
    }
    if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || !env.ADMIN_UID) {
      return json({ error: "Configurazione Worker incompleta: verifica variabili e secrets." }, 503, allowedOrigin);
    }
    try {
      await verifyFirebaseAdmin(request, env);
      const period = url.searchParams.get("period") || "24h";
      if (!["24h", "7d", "30d"].includes(period)) {
        return json({ error: "Intervallo non valido." }, 400, allowedOrigin);
      }
      const data = await fetchAnalytics(env, period);
      return json(data, 200, allowedOrigin);
    } catch (error) {
      const message = error.message || "Errore interno.";
      const status = message.includes("Autenticazione") ? 401 :
        message.includes("non autorizzato") ? 403 : 502;
      return json({ error: message }, status, allowedOrigin);
    }
  }
};
