# Brandfetch

Brand data for a workflow: logos, colors, fonts, imagery, social links, description and company
facts for a domain, ticker, ISIN, crypto symbol or card transaction. Vendor docs:
<https://docs.brandfetch.com> (OpenAPI: <https://docs.brandfetch.com/openapi.json>).

Category: **marketing** (also `developer-tools`). Icon: the vendor's `favicon.svg`, verbatim.

## Connecting

Create an API key at <https://developers.brandfetch.com>. It is sent as `Authorization: Bearer <key>`
by the connection's `sign` hook; no action ever sees it.

An optional **Brand Search client ID** (same dashboard, not secret) can be added. The Brand Search
API is documented as authenticated by that client ID, sent as the `c` query parameter, so `sign` adds
it to `/v2/search/*` requests and to nothing else. Measured 2026-10-06: search also answers 200
without `c`, so the field is optional.

**Not included, on purpose:** the Logo/CDN API (`cdn.brandfetch.io/{domain}?c=<clientId>`). It serves
images from a URL you embed directly; there is nothing to call, and putting the client ID in an
action would break the rule that credentials live only in `sign`. Also left out: the agent
pay-per-request access offer (`/v2/agents/access`), which buys a key with a crypto or Stripe payment.

## Actions (9)

| Action | Route | Notes |
| --- | --- | --- |
| Get Brand | `GET /v2/brands/{identifier}` | domain, website URL, email, brand ID, ticker, ISIN or crypto |
| Get Brand by Domain | `GET /v2/brands/domain/{domain}` | explicit route, no collisions |
| Get Brand by Ticker | `GET /v2/brands/ticker/{ticker}` | |
| Get Brand by ISIN | `GET /v2/brands/isin/{isin}` | |
| Get Brand by Crypto Symbol | `GET /v2/brands/crypto/{symbol}` | |
| Search Brands | `GET /v2/search/{name}` | brand ID, name, domain, icon |
| Get Brand Context | `GET /v2/context/{domain}` | JSON (snake_case) or Markdown |
| Get Brand from Transaction | `POST /v2/brands/transaction` | label + country code |
| Get API Key Usage | `GET /v2/viewer` | free; used / quota / remaining |

The brand actions add two derived fields to the vendor's response, `logoUrl` and `iconUrl` (SVG
preferred, dark-theme logo first), alongside the full `logos`, `colors`, `fonts`, `images`, `links`
and `company` objects.

## Vendor behaviour worth knowing

- **No key is `402`, not 401.** The vendor sells pay-per-request access, so a request with no
  credential gets a payment challenge. A malformed `Authorization` header is `401 Unauthorized`; an
  unknown or revoked key is `403 Forbidden`. The connection test treats all three as a rejection and
  decides from the response body, never echoing the key.
- **Every 404 is billed**, including "brand not found". With `x-bf-error: crawl_queued` the brand
  was not held and is now being collected: retry in a minute or two. The actions return that as
  `crawlQueued: true` rather than an error. Other 404s throw.
- **`cachedOnly=true`** answers from the store only; a miss is `204` (not billed), returned as
  `notIndexed: true`.
- Brand Context responses use snake_case (`canonical_name`, `value_proposition`); every other
  endpoint is camelCase.
- `GET /v2/viewer` is free and returns the key's name, organization and exact credit usage, which is
  what powers both the connection test and the quota check.

## Health checks

| Check | Kind | Probe |
| --- | --- | --- |
| `service` | service | <https://status.brandfetch.io/index.json> (Better Stack). Page verified real: id `143651`, `company_name` Brandfetch. The Statuspage paths and `/history.atom` return the HTML shell with a 200 and prove nothing. The worst of `Brand API`, `Brand Context API` and `Search API` decides; the CDNs, website, dashboard and docs are detail, capped at `degraded`. |
| `api` | dependency | Unsigned `GET /v2/viewer`; the schema-correct `401 {"message":"Unauthorized"}` is a pass, a 5xx is `down`. |
| `quota` | quota | Signed `GET /v2/viewer` (`usage.used` / `usage.quota`): `degraded` from 90%, `down` at 100%. |

Plus the derived `auth:api-key` check from the connection test. Every check is a live probe, so no
`unavailable` / informational entry is declared.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
