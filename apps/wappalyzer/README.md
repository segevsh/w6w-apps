# Wappalyzer

Website technology intelligence: look up the tech stack behind up to ten URLs, discover a
company's serving subdomains, verify an email address, and build technographic lead lists.

- **Vendor:** [Wappalyzer](https://www.wappalyzer.com/) — Developer Tools
- **API version:** v2 (`api.wappalyzer.com`)
- **Auth:** API key (`x-api-key` header). A **Business plan or higher** is required for API
  access, per every reference page's own gating banner.

## What was verified, and how

Everything in this app was checked on **2026-09-29** against Wappalyzer's own **OpenAPI 3.1
contract**, published at `https://www.wappalyzer.com/openapi/v2-public.yaml` and linked from the
Basics page — not a third-party integration directory. The contract was cross-read against the
human-authored reference pages it was generated from
(`www.wappalyzer.com/docs/api/v2/{basics,lookup,subdomains,verify,lists}/`), plus live probes
against `api.wappalyzer.com` and its status surfaces.

## Findings worth knowing

1. **A missing API key and a wrong one answer byte-for-byte identically.** Three requests to the
   same endpoint were compared live — no `x-api-key` header at all, a syntactically-plausible-but-
   fake key, and a bearer-style `Authorization` header instead of `x-api-key` — and all three
   returned the exact same `403 {"message":"Forbidden"}` (23 bytes,
   `x-amzn-errortype: ForbiddenException`, the signature of an AWS API Gateway usage-plan key
   check). This isn't a shortcut in this app's error handling — it's what the vendor's gateway
   sends. The Basics page confirms it structurally: `403` is documented as **one** bucket
   ("incorrect API key, invalid method or resource, or insufficient credits"), not three
   distinguishable cases. `auth/api-key.ts`'s `test` hook reports that honestly instead of
   inventing a distinction the API doesn't make.
2. **Collection endpoints carry a trailing slash; item endpoints under a list ID never do.** Every
   worked example for `GET /v2/lookup/`, `/v2/subdomains/`, `/v2/verify/`, `/v2/credits/balance/`
   and `GET|POST /v2/lists/` carries the trailing slash; `GET|POST|DELETE /v2/lists/{id}` never
   does. The OpenAPI document's own `paths` keys omit it everywhere (`/lookup`, not `/lookup/`),
   which is why this app follows the human docs' worked `curl` examples rather than the machine
   paths verbatim — see `lib/client.ts` for the split, pinned by test.
3. **No vendor-stated credit ceiling exists.** `GET /v2/credits/balance/` returns a raw
   `{"credits": N}` balance with no plan size or reset date anywhere in the documented API, so
   `health/quota.ts` reports remaining credits only — never a fabricated percentage or an invented
   "limit".
4. **The vendor's own status pages aren't trustworthy for this API.** `status.wappalyzer.com` is a
   genuine, currently-maintained UptimeRobot-hosted page for the product (correct title, favicon,
   footer link back to `www.wappalyzer.com`) — but it is entirely client-rendered, with no
   discoverable JSON/RSS/Atom feed in its shipped JS bundles. A separate
   `wappalyzer.statuspage.io/api/v2/summary.json` answers `200` and self-identifies as
   `"Wappalyzer"`, but its `components` and `incidents` arrays have been **empty since it was last
   updated on 2021-07-28** — five years stale, read as an abandoned setup rather than a live
   signal. `health/service.ts` declares the vendor status check unavailable rather than wiring in
   either.

## Actions (9)

| Key | Type | Endpoint | Notes |
|---|---|---|---|
| `lookup` | read | `GET /v2/lookup/` | The core of this app. Up to 10 URLs, cached or live, sync or async (crawl + callback). Passes all three documented response shapes (completed / pending crawl / per-URL error) through unchanged. |
| `subdomains-list` | search | `GET /v2/subdomains/` | Website-serving subdomains for up to 10 domains, from Wappalyzer's dataset — not a live DNS walk. |
| `verify-email` | read | `GET /v2/verify/` | Deliverability signals for one address: reachability, disposable/role-account/catch-all detection, MX/SMTP validity. |
| `credits-balance-get` | read | `GET /v2/credits/balance/` | Free — does not spend credits. Also the connection-liveness probe. |
| `lists-list` | search | `GET /v2/lists/` | Every lead list this account has created. |
| `lists-get` | read | `GET /v2/lists/{id}` | A lead list's full detail — filters, status, pricing, download URLs once ready. |
| `lists-create` | perform | `POST /v2/lists/` | Build a lead list from technology/keyword/company filters. Free; always asynchronous — poll `lists-get` or use a callback URL. Not idempotent. |
| `lists-finalize` | perform | `POST /v2/lists/{id}` | Spend credits to unlock a Ready list's download. `spendCredits` must exactly match the list's `totalCredits`. Not idempotent. |
| `lists-delete` | perform | `DELETE /v2/lists/{id}` | Permanently delete a list. Idempotent. |

Every `wappalyzer-credits-spent` / `wappalyzer-credits-remaining` response header the OpenAPI
document declares for an endpoint is surfaced in that action's output; endpoints the document
does not declare the headers for (`lists-list`, `lists-get`, `lists-delete` — all free) don't
claim them.

## Auth

**API Key** (`x-api-key` header, no prefix). Get one from your Wappalyzer account (Account > API).

The connection-liveness probe is `GET /v2/credits/balance/` — the one endpoint in this app's
surface that costs nothing, requires a credential, and returns no account-identifying detail
(just `{"credits": N}`), which is what makes it safe to run on a health-check cadence.

## Health checks

| Check | Kind | Source |
|---|---|---|
| `service` | `service` | **Declared unavailable** (`informational`) — see finding 4 above. |
| `quota` | `quota` | `GET /v2/credits/balance/` — remaining credits only, no ceiling. `down` at 0 credits (every metered call is refused), `ok` above 0. |
| `auth:api-key` | `credential` | Derived automatically from `Auth.test`. |

## Not implemented

Nothing in the documented v2 surface was left out — `lookup`, `lists` (all five operations),
`subdomains` and `verify` cover every endpoint in the published OpenAPI contract as of
2026-09-29. If Wappalyzer publishes new endpoints later, this app does not yet cover them.
