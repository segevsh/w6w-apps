# Shopify

Manage Shopify products, orders, customers and inventory through the Admin REST API.

- **Categories** — commerce
- **Auth methods** — access-token
- **Actions** — 18
- **Egress allowlist** — `*.myshopify.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://www.shopifystatus.com>

```
GET https://www.shopifystatus.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /shop.json
```

The store's own record. Needs only the base access a token always has — unlike
`/products.json`, which n8n probes and which 403s without `read_products`.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-Shopify-Shop-Api-Call-Limit` response header, formatted `used/total` (e.g. `32/40`).
It is a leaky bucket, so headroom refills continuously rather than resetting on a
boundary.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
