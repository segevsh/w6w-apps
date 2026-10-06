# CoinGecko

Crypto prices, market data, charts, search, trending, global stats and exchanges from the
CoinGecko v3 API. App id `io.w6w.coingecko`, categories `finance`, `analytics`.

Verified 2026-10-06 against CoinGecko's OpenAPI document
(`https://docs.coingecko.com/openapi-specs/pro-api.json`, v3.0.0) and live probes of
`api.coingecko.com`, `pro-api.coingecko.com` and `status.coingecko.com`.

## Auth

Two auth methods, because the plan decides both the **host** and the **header name**:

| Method         | Plans                                      | Host                     | Header              |
| -------------- | ------------------------------------------ | ------------------------ | ------------------- |
| `demo-api-key` | Demo (free)                                | `api.coingecko.com`      | `x-cg-demo-api-key` |
| `pro-api-key`  | Basic, Analyst, Lite, Pro, Enterprise      | `pro-api.coingecko.com`  | `x-cg-pro-api-key`  |

Create the key in the CoinGecko developer dashboard. Actions are written against
`api.coingecko.com`; the `pro-api-key` method's `sign` hook rewrites the host to
`pro-api.coingecko.com` when it signs, so no action knows which plan it runs under.
Both hosts are in `network.allow`.

The connection test is `GET /ping` **with the key header attached**. Measured 2026-10-06:
an unauthenticated `/ping` on the demo host answers `200 {"gecko_says": ...}`, so it proves
nothing about a key. The same request carrying an unknown key answers `401`, body
`error_code 10002` ("API Key Missing"). The verdict is read from the body: `gecko_says`
passes, `10002` is a rejected key, `10010`/`10011` means the key belongs to the other plan's
method. `/ping` never returns the key. The positive path for a *valid* key was not exercised
(no key was available); it is inferred from the vendor's documented `/ping` response.

## Actions (18)

`ping`, `get-api-usage` (paid plans), `get-simple-price`, `list-supported-currencies`,
`list-coins`, `list-coin-markets`, `get-coin`, `get-coin-history`, `get-coin-market-chart`,
`get-coin-market-chart-range`, `get-coin-ohlc`, `search`, `get-trending`, `get-global`,
`list-exchanges`, `list-exchange-ids`, `list-categories`, `list-category-ids`.

List endpoints that return a bare JSON array are wrapped (`{ coins }`, `{ exchanges }`,
`{ categories }`, `{ candles }`, `{ currencies }`, `{ prices }`) so every output is an object.
Everything else is returned as the vendor sends it (`/global` keeps its `data` wrapper).

## Not yet covered

`/simple/token_price/{id}`, `/coins/top_gainers_losers`, `/coins/{id}/tickers`,
`/coins/{id}/ohlc/range`, contract-address coin/chart endpoints, circulating/total-supply
charts and supply breakdown, `/coins/list/new`, `/asset_platforms`, `/token_lists/...`,
`/exchanges/{id}` (+ tickers, volume charts), derivatives, NFTs, `/exchange_rates`,
`/news`, `/insights`, `/global/decentralized_finance_defi`, `/global/market_cap_chart`, public
treasury, RWA, and the whole `/onchain/*` (GeckoTerminal) family. Several are paid-plan only.

## Icon

`assets/icon.png` is the vendor's own `https://www.coingecko.com/favicon-96x96.png`
(PNG 96x96, 1,684 bytes), unmodified.

## Health checks

- **`service`** (informational) — `status.coingecko.com` is a StatusHQ page, not an Atlassian
  Statuspage: `/api/v2/summary.json`, `/api/v2/status.json`, `/feed.rss`, `/index.json` and
  `/summary.json` all 404 as HTML. The only machine-readable surface is
  `https://status.coingecko.com/history.atom` (Atom, "CoinGecko Status - Incident History"),
  declared as a `feed`. The page has no per-component state, so any open (not resolved/completed)
  incident reports `degraded`, never `down`. At verification time the feed had no entries, so
  the open-incident path is covered by unit tests, not by a live incident.
- **`quota`** (informational) — monthly call credits from `GET /key` (plan, rate limit and
  credit counters; does not echo the key). `/key` is a paid-plan endpoint, so a Demo connection
  reports `unknown` rather than failing.
- The credential check is derived from each auth method's `test`.

## Gotchas

- A Pro key on the demo host (or vice versa) is refused; error code `10010` carries the hint.
- Three different error body shapes exist (`{error}`, `{status:{error_code,error_message}}`,
  and `error_code` hoisted beside `status`); the client reads all three.
- Demo-host `simple/price` answered `200` even with a bogus key header (public, cached), so it
  is a poor credential probe — `/ping` is the one that reacts to the header.
