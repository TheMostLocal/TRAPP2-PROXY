// ============================================================
//  >>> DESTINATION: TheMostLocal/TRAPP2-PROXY   (new repo, z142) — deployed on Vercel
//  >>> FILE PATH:   api/v.js
//
//  THE KEY PROXY. The app (and anyone you share it with) calls market-data vendors through
//  here WITHOUT any API key: GET /api/v?u=<the vendor URL, no key>. This function adds the key
//  from Vercel's environment variables server-side, forwards the request and returns the
//  vendor's answer. Keys never reach a browser, never sit in a public repo, and live in one
//  place (Vercel → Project → Settings → Environment Variables).
//
//  Safety: only the vendor hosts below (no open proxy) · HTTPS only · GET only · any key the
//  caller put in the URL is stripped · browsers outside ALLOWED_ORIGINS are refused · answers
//  are cached at Vercel's edge (identical requests within the cache window cost one vendor call).
//  Env: FMP_KEY FINNHUB_KEY POLYGON_KEY ALPHAVANTAGE_KEY TWELVEDATA_KEY FCS_KEY FRED_KEY
//       MARKETAUX_KEY (set the ones you have) · ALLOWED_ORIGINS (default https://themostlocal.github.io)
// ============================================================
const HOSTS = {
  'financialmodelingprep.com': { env: 'FMP_KEY', param: 'apikey', ttl: 300 },
  'finnhub.io': { env: 'FINNHUB_KEY', param: 'token', ttl: 60 },
  'api.polygon.io': { env: 'POLYGON_KEY', param: 'apiKey', ttl: 300 },
  'www.alphavantage.co': { env: 'ALPHAVANTAGE_KEY', param: 'apikey', ttl: 300 },
  'api.twelvedata.com': { env: 'TWELVEDATA_KEY', param: 'apikey', ttl: 60 },
  'fcsapi.com': { env: 'FCS_KEY', param: 'access_key', ttl: 300 },
  'api-v3.fcsapi.com': { env: 'FCS_KEY', param: 'access_key', ttl: 300 },
  'api-v4.fcsapi.com': { env: 'FCS_KEY', param: 'access_key', ttl: 300 },
  'api.stlouisfed.org': { env: 'FRED_KEY', param: 'api_key', ttl: 3600 },
  'api.marketaux.com': { env: 'MARKETAUX_KEY', param: 'api_token', ttl: 300 },
};
const KEY_PARAMS = [...new Set(Object.values(HOSTS).map(h => h.param))];

function origins() {
  return String(process.env.ALLOWED_ORIGINS || 'https://themostlocal.github.io').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
}

module.exports = async function handler(req, res) {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  const allow = origins();
  const okOrigin = !origin || allow.includes('*') || allow.includes(origin);   // no Origin = same-site / server call
  res.setHeader('Vary', 'Origin');
  if (origin && okOrigin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!okOrigin) return res.status(403).json({ error: `origin ${origin} not allowed` });

  let u;
  try { u = new URL(String((req.query && req.query.u) || '')); } catch { return res.status(400).json({ error: 'pass the vendor URL as ?u=' }); }
  const h = HOSTS[u.hostname];
  if (u.protocol !== 'https:' || !h) return res.status(403).json({ error: `host ${u.hostname} is not a supported vendor` });
  const key = process.env[h.env];
  if (!key) return res.status(503).json({ error: `${h.env} is not set on the proxy (Vercel → Settings → Environment Variables)` });
  for (const p of KEY_PARAMS) u.searchParams.delete(p);          // a caller can never inject or read a key
  u.searchParams.set(h.param, key);

  let r;
  try {
    r = await fetch(u.toString(), { headers: { 'User-Agent': 'valuatio-proxy', Accept: 'application/json, text/csv, */*' } });
  } catch (e) {
    return res.status(502).json({ error: 'vendor unreachable' });
  }
  const body = Buffer.from(await r.arrayBuffer());
  res.status(r.status);
  res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
  res.setHeader('Cache-Control', r.ok ? `public, s-maxage=${h.ttl}, stale-while-revalidate=${h.ttl * 4}` : 'no-store');
  res.setHeader('X-Valuatio-Proxy', u.hostname);
  return res.send(body);
};
module.exports.HOSTS = HOSTS;