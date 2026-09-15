# Firecrawl

Turn any web page or site into clean, LLM-ready markdown: scrape a single URL, crawl a whole site,
map its URLs, search the web, or extract structured data with an AI prompt — on the **Firecrawl v2
API**.

- **Categories** — ai, developer-tools, search
- **Auth methods** — api-key
- **Actions** — 10
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.firecrawl.dev` (the `service` check adds `status.firecrawl.dev` to its
  own hook allowlist, never to the app's)
- **Website** — https://firecrawl.dev/
- **API docs** — https://docs.firecrawl.dev/
- **OpenAPI** — https://docs.firecrawl.dev/api-reference/v2-openapi.json
- **Status page** — https://status.firecrawl.dev/

> **Everything below was verified against Firecrawl's own sources on 2026-09-15** — its
> machine-readable OpenAPI 3.0 document
> ([`docs.firecrawl.dev/api-reference/v2-openapi.json`](https://docs.firecrawl.dev/api-reference/v2-openapi.json),
> 413,603 bytes, `info.version` `v2`), the `docs.firecrawl.dev` pages it links, and live probes
> against `api.firecrawl.dev` and `status.firecrawl.dev`. Nothing here came from a third-party
> integration directory.

## The three things most likely to go wrong

### 1. Two endpoints work with no API key at all — and that breaks the obvious health check

`POST /scrape` and `POST /search` both answer successfully on a rate-limited "keyless free tier" —
measured live: `{"url": "https://example.com"}` with **no** `Authorization` header returned a full
`200` `ScrapeResponse`, and a keyless search returned real results. Every other endpoint this app
calls (`map`, `crawl`, `batch/scrape`, `extract`, `team/credit-usage`) rejects the same
unauthenticated request with a `401` naming the keyless tier explicitly:

> "This endpoint is not supported by the keyless free tier. Sign up for a free API key at
> https://www.firecrawl.dev/signin for more endpoints, more usage, and higher rate limits."

That rules out the tempting health-check design of "call an action, see if it works" — a
Connection whose key never got attached would still pass a probe against `scrape` or `search`. The
auth probe (`GET /team/credit-usage`) is a dedicated, credential-only endpoint instead. See
**Auth** below for the two distinct 401 bodies this app reads to tell "no credential" apart from
"wrong credential" — both arrive as the same HTTP status.

### 2. HTTP 200 can still mean the call failed

`POST /scrape` against a domain that fails DNS resolution answers **HTTP 200** with:

```json
{"success": false, "code": "SCRAPE_DNS_RESOLUTION_ERROR", "error": "DNS resolution failed for hostname \"...\". ..."}
```

— measured live against a nonexistent domain. Checking only `res.ok` would report that scrape as a
success with an empty page. [`lib/client.ts`](lib/client.ts) checks every response body for
`success === false` regardless of status code, and a pinned test
([`tests/lib/client.test.ts`](tests/lib/client.test.ts)) asserts it throws on exactly this shape.

Relatedly, a `400` validation failure carries a structured `details` array, not just a flat
message — `{"success": false, "code": "BAD_REQUEST", "error": "Bad Request", "details": [{"path":
["url"], "message": "Invalid input: expected string, received undefined"}]}`, also measured live.
`formatFirecrawlError` flattens each `details` entry into `path: message` rather than discarding
them behind the useless top-level "Bad Request" string.

### 3. Vendor defaults on size-shaped fields are generous, not conservative

`crawl`'s own `limit` defaults to **10,000 pages** when left unset — documented directly in the
OpenAPI schema — and `map`'s `limit` defaults to **5,000** links (ceiling 100,000). Both
`crawl-start` and `map` prefill a much smaller number (100 and 500 respectively) and say so in the
field hint, the same pattern this pack's `apify` app uses for Apify's own oversized list defaults.

## Auth

One method: `api-key`, type `bearer` (`Authorization: Bearer <key>`, per the OpenAPI document's
`securitySchemes.bearerAuth`).

### The probe is `GET /team/credit-usage`, chosen by testing all three cases live

| Case | Result |
| --- | --- |
| No `Authorization` header | `401` — `"This endpoint is not supported by the keyless free tier. …"` |
| Wrong/revoked key | `401` — `{"success": false, "error": "Unauthorized: Invalid token"}` |
| Working key | `200` — `{"success": true, "data": {"remainingCredits", "planCredits", "billingPeriodStart", "billingPeriodEnd"}}` |

Both failure cases are the same HTTP status, so `auth/api-key.ts` never classifies validity by
status code alone — it reads which of the two error strings came back, per this pack's rule that a
credential probe must read the response body, not just the status. The endpoint also carries no
credential material and no team name (so there is no `afterConnect` here — nothing worth
publishing as a connection label).

Firecrawl publishes no OAuth surface for third-party apps, so the key is the whole authentication
story.

## Actions

10 actions. `crawl`, `batch-scrape` and `extract` are asynchronous jobs: the `*-start` action
returns a job id immediately, and a separate `*-status-get` action polls it — the run/poll split
this pack's `apify` app uses for Actor runs.

| Key | Type | Endpoint |
| --- | --- | --- |
| `scrape` | read | `POST /scrape` |
| `map` | search | `POST /map` |
| `search` | search | `POST /search` |
| `crawl-start` | perform | `POST /crawl` |
| `crawl-status-get` | read | `GET /crawl/{id}` |
| `crawl-cancel` | perform | `DELETE /crawl/{id}` |
| `batch-scrape-start` | perform | `POST /batch/scrape` |
| `batch-scrape-status-get` | read | `GET /batch/scrape/{id}` |
| `extract-start` | perform | `POST /extract` |
| `extract-status-get` | read | `GET /extract/{id}` |

### Response shapes: envelope, sometimes; `success` check, always

Most endpoints wrap their payload as `{"success": true, "data": …}` (`scrape`, `search`), and
[`lib/client.ts`](lib/client.ts)'s `data()` unwraps it. The job-starting endpoints (`crawl`,
`batch/scrape`, `extract`) instead return `id`/`url` fields directly at the top level, and their
*status* endpoints (`GET /crawl/{id}`, `GET /batch/scrape/{id}`) carry **no** `success` field at
all — `data` there is the array of scraped pages, not an envelope wrapper. `map` returns `links`
directly, with no `data` key of any kind. `json()` (no unwrap) is used for all of these. Every
path — wrapped or not — is still checked for `success === false` (finding 2 above).

### Idempotency

**None of the three job-starting endpoints document an idempotency key**, unlike some other APIs
in this pack (Apify's Create Webhook, for instance). `crawl-start`, `batch-scrape-start` and
`extract-start` are all `idempotent: false` — a retry after a dropped connection bills a second,
separate job. `crawl-cancel` is `idempotent: true`: cancelling an already-cancelled or
already-finished crawl ends the same way either way, though an unknown job id still surfaces as a
`404` error rather than being silently swallowed.

### Notes on individual actions

- **`scrape` is classified `read`, not `perform`**, mirroring how this pack's `exa` app classifies
  its own `get-contents` action: it fetches content by URL rather than creating or mutating a
  resource, even though it is billed per call. `search`/`map` are `search`, matching `exa`'s own
  `search`/`find-similar`.
- **`crawl-start`/`batch-scrape-start` accept `scrapeOptions` for how each page should be
  scraped** — the same `formats`/`onlyMainContent`/`waitFor`/etc. fields `scrape` itself exposes,
  nested under `scrapeOptions` in the wire body for `crawl` and spread at the top level for
  `batch/scrape` (that endpoint's schema merges `ScrapeOptions` directly into its own body via
  `allOf`, unlike `crawl`'s nested field).
- **`search`'s `scrapeOptions` is opt-in.** Leaving `formats` empty sends no `scrapeOptions` at
  all, returning search metadata only with nothing fetched; requesting a format nests it exactly
  like `crawl`.
- **`map`'s `includeSubdomains` and `ignoreQueryParameters` default to `true`** on the vendor's
  side, and this app mirrors that rather than overriding it — the opposite of `limit`, where the
  vendor's own default is the one field worth shrinking.
- **`extract-start`'s `urls` accepts glob patterns** (`https://example.com/blog/*`) per the
  vendor's own docs, which is why it stays a plain newline/comma-separated string field rather
  than a strict URL validator.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — a Better Stack page, confirmed the same way this pack's `apollo` app confirms its own

1. Every Atlassian-Statuspage-shaped path (`/api/v2/summary.json`, `/api/v2/<bogus>.json`)
   answers **301** to `/` — this is not Statuspage.
2. `GET /index.json` (sent with `Accept: application/json`) answers `200` with
   `content-type: application/json`, Better Stack's own JSON:API shape, and self-identifies:
   `"company_name": "Firecrawl", "company_url": "https://firecrawl.dev",
   "custom_domain": "status.firecrawl.dev"`.
3. A bogus sibling path (`/index-not-real.json`) answers **301**, not a decoy `200`.

Two monitors are published, and — unlike Apollo's page, where none named the REST API — **both are
directly relevant**: `api.firecrawl.dev` (the surface every action here calls) and `firecrawl.dev`
(the marketing site). Both are reported at the pack's `degraded` default severity for
`kind: "service"`; a future monitor added to the page is simply ignored by the `RELEVANT_MONITORS`
filter rather than failing the check.

### `quota` — credit headroom, from the same endpoint the auth probe uses

`GET /team/credit-usage` returns `remainingCredits` and `planCredits` in one call — the same
endpoint `auth/api-key.ts` uses to verify the credential is live, deliberately: it is the one
endpoint in this app's surface that needs a credential and returns nothing secret, so it is
simultaneously the right liveness probe and the only source of quota headroom.
`remainingCredits <= 0` reports `down` (every billed endpoint documents `402 Payment required` as
its out-of-credit response), 90%+ consumed reports `degraded`, matching the severity discipline
this pack's `apify` app applies to its own monthly-usage dimension.

Firecrawl publishes no separate "requests per minute remaining" signal (no `X-RateLimit-*`
response headers were observed on any live probe), so credits are the one meter this app reports.

## Deliberately not covered

Firecrawl's API has **54 documented operations across 43 paths** (counted directly from the
OpenAPI document's `paths`, one entry per HTTP method excluding the shared `parameters` block).
This app covers 10 — the scrape/crawl/map/
search/extract path plus batch scrape, the operations named in this project's brief. What is left
out, and why:

- **`GET /crawl/{id}/errors`, `GET /batch/scrape/{id}/errors`** — per-page failure detail for a job
  already covered by its status action. Worth adding; left out for scope.
- **`GET /crawl/active`, `POST /crawl/params-preview`** — account-wide job listing and a
  dry-run parameter preview. Neither is part of the run/poll path a single workflow step needs.
- **`/agent/**` (6 operations)** — a separate, heavier browsing-agent job type (snapshots, traces),
  distinct from the scrape/crawl/extract family this app covers.
- **`/monitor/**` (8 operations)** and **`/interact/**` (4 operations)** — scheduled change-tracking
  monitors and interactive (click/type/scroll) browsing sessions. Both are substantial features in
  their own right, not extensions of a single scrape/crawl call.
- **`/search/developer`, `/search/research/papers/**` (5 operations)** — specialized search
  categories (developer docs, academic papers) reachable more simply via `search`'s own
  `categories` field for the common case; the dedicated endpoints add pagination/similarity
  surfaces this app does not cover.
- **`POST /parse`** — a separate lightweight HTML-to-markdown parser without the scrape pipeline's
  rendering; overlaps enough with `scrape` that adding it needs its own scoping pass.
- **`/team/activity`, `/team/queue-status`, `/team/threat-protection`, `/team/token-usage*`** —
  operational/billing visibility beyond credit headroom. `credit-usage` was chosen because it is
  also the auth probe (see Health checks); the others are additive.
- **`POST /feedback`, `POST /search/{jobId}/feedback`, `/support/ask`, `/support/docs-search`** —
  feedback and support-search endpoints, not workflow automation surface.
- **Advanced `ScrapeOptions` fields**: `parsers` (PDF page-by-page handling), `actions` (in-page
  automation — click/scroll/wait before capture), `location`/`proxy`/`lockdown`/`redactPII`/
  `profile`/`threatProtection`/`auditMetadata`/`skipTlsVerification`/`onlyCleanContent`/`minAge`.
  Each is real and documented; left out because they need nested, feature-specific config beyond a
  flat field list. See [`lib/params.ts`](lib/params.ts).
- **Vertical-specific `formats`**: `json` (schema/prompt extraction — that's the `extract` action's
  own job), `changeTracking`, `branding`, `product`, `menu`, `audio`, `video`, `question`,
  `highlights`, `rawBase64`. `formatOptions` in [`lib/params.ts`](lib/params.ts) covers the seven
  general-purpose formats (markdown, summary, html, rawHtml, links, images, screenshot).
- **10 MB response pagination** (`next` on the crawl/batch-scrape status responses) — this app
  returns whatever fits in one response; following `next` is a follow-up action.
- **Webhooks** (`crawl`/`batch/scrape`'s `webhook` field) — a workflow step here polls status
  instead, the same choice `apify` makes for its own Actor runs.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` is Firecrawl's own mark — a single flame path in the brand orange `#FA5D19` —
downloaded **verbatim** from `https://www.firecrawl.dev/logo.svg` on 2026-09-15: 1,523 bytes, a
`200 x 284` viewBox, one `<path>`. The brief's suggested source
(`https://www.firecrawl.dev/favicon.png`, confirmed reachable, 48×48 PNG) was not needed: the
vendor's own domain serves a real SVG mark directly, so no simple-icons lookup or PNG-to-SVG
conversion was required. It is not formatted by `deno task fmt`, whose file list names only the
`.ts` directories.

## Layout

```
firecrawl/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # FirecrawlClient, the envelope/no-envelope split, success:false check
│   └── params.ts                # shared Param fragments (scrapeOptions, formats, url params, …)
├── auth/api-key.ts              # bearer token: sign, test
├── actions/                     # one file per action (10)
├── health/
│   ├── service.ts               # status.firecrawl.dev (Better Stack)
│   └── quota.ts                 # credit headroom, signed
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
