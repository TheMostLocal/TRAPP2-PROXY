# TRAPP2-PROXY — the key proxy (z142)

Market-data API keys live **only** here, as Vercel environment variables. The app calls
`https://<your-project>.vercel.app/api/v?u=<vendor URL without a key>`; this function adds the key
server-side and returns the vendor's answer. Nobody using the app needs a key, and no key is public.

## Deploy (once, ~5 minutes)
1. Vercel → **Add New… → Project → Import** `TheMostLocal/TRAPP2-PROXY` → Framework preset **Other** → Deploy.
2. Project → **Settings → Environment Variables** (Production), add the keys you have:
   `FMP_KEY`, `FINNHUB_KEY`, `POLYGON_KEY`, `ALPHAVANTAGE_KEY`, `TWELVEDATA_KEY`, `FCS_KEY`, `FRED_KEY`, `MARKETAUX_KEY`
   and `ALLOWED_ORIGINS` = `https://themostlocal.github.io`
3. **Deployments → Redeploy** (env changes apply on the next deploy).
4. Check: open `https://<your-project>.vercel.app/api/v?u=https://finnhub.io/api/v1/quote?symbol=AAPL` — JSON with `c` (price).
5. Put the URL in `TRAPP2-1/data/app_config.json`: `{ "keyProxy": "https://<your-project>.vercel.app/api/v" }`.

Supported hosts: financialmodelingprep.com, finnhub.io, api.polygon.io, www.alphavantage.co, api.twelvedata.com,
fcsapi.com (+ api-v3 / api-v4), api.stlouisfed.org (FRED — also fixes FRED's missing browser CORS), api.marketaux.com.
