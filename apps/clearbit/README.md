# Clearbit

Enrich people and companies, search for prospects, resolve anonymous website visitors, autocomplete
company names, and score sign-up risk via Clearbit.

- **Categories** — marketing, crm
- **Auth methods** — api-key (`basic`)
- **Actions** — 9
- **Egress allowlist** — `person-stream.clearbit.com`, `company-stream.clearbit.com`,
  `company.clearbit.com`, `prospector.clearbit.com`, `reveal.clearbit.com`, `risk.clearbit.com`,
  `autocomplete.clearbit.com`

## Links

- **Website** — https://clearbit.com
- **API docs** — https://dashboard.clearbit.com/docs (as of 2026-08-01 this now redirects
  unauthenticated visitors straight to a HubSpot login — see "The HubSpot acquisition" below; the
  authoritative shape used to build this app came from Clearbit's own official SDK source instead,
  see "How this app was verified")
- **GitHub org** — https://github.com/clearbit (official SDKs, several archived/deprecated —
  `clearbit-node`, `clearbit-go`, `clearbit-ruby`, etc.)

## The HubSpot acquisition — read this before connecting

HubSpot acquired Clearbit in November 2023 and folded the product into **Breeze Intelligence**.
Researched live 2026-08-01:

- Clearbit Connect (the Gmail sidebar) was discontinued December 2024.
- The free Clearbit tier, Weekly Visitor Report and Slack integration ended 2025-04-30.
- The free Logo API was sunset 2025-12-01.
- `dashboard.clearbit.com/docs` and `clearbit.com/docs` both now redirect to a HubSpot login page
  instead of serving public API documentation.
- New enrichment access is sold **inside HubSpot** as Breeze Intelligence credits, on top of a paid
  HubSpot subscription — there is no longer a way for a *new* customer to get a standalone Clearbit
  Secret API Key.

**The classic API surface this app calls is still live**, though. Every host below was probed
unauthenticated on 2026-08-01 and answered with Clearbit's own, real `401
{"error":{"type":"auth_required","message":"Authentication is required for this action. Sign up at
https://clearbit.com"}}` — not a DNS failure, not a generic 404, not a redirect to HubSpot. That
means: an **existing** Secret API Key minted before the migration continues to authenticate against
`person-stream`, `company-stream`, `company`, `prospector`, `reveal`, `risk` and `autocomplete`
exactly as documented for the last decade. This app is built for that population — teams who already
hold a legacy Clearbit key — not for provisioning a new one. If your key was issued through HubSpot
Breeze Intelligence rather than a legacy Clearbit account, it may not carry the same scopes; the
`api-key` auth's `test` hook is the fastest way to find out.

This is also why `status.clearbit.com` (a separately-hosted Atlassian Statuspage instance, still
live and still reporting on this classic surface) is a meaningful `service` health check here, even
though the product's own dashboard has moved behind a HubSpot login.

## How this app was verified

`dashboard.clearbit.com/docs` no longer serving public documentation meant every endpoint, host,
parameter name and auth scheme here was cross-checked against **primary sources**, not blog posts:

1. **Clearbit's own official `clearbit-node` SDK** (`github.com/clearbit/clearbit-node`, archived —
   "no longer maintained", but its source is the historical ground truth for the wire format): the
   exact host-building logic (`src/client.js`: `https://%s%s.clearbit.com/v%s`), the Basic-Auth
   scheme (`username: this.key, password: ''`), and every resource's path/params
   (`src/enrichment/person.js`, `src/enrichment/company.js`, `src/enrichment.js` (combined),
   `src/name_to_domain.js`, `src/prospector.js`, `src/reveal.js`, `src/risk.js`), each pinned by
   that SDK's own test suite and fixtures (`test/*.js`, `test/fixtures/*.json`).
2. **n8n's production Clearbit node** (`n8n-io/n8n`, `packages/nodes-base/nodes/Clearbit/`) as an
   independent second source — it maps the same fields to the same snake_case query parameters, and
   is where the `-stream` host variant (see below) is confirmed as real, currently-used production
   behavior rather than an SDK-only option nobody exercises.
3. **Live, unauthenticated probes** against every host this app calls (2026-08-01, see above) —
   confirming the surface itself, not just old documentation, still answers.
4. **Clearbit's own Help Center** ("Autocomplete, Name to Domain, and Risk API FAQ") for which
   endpoints remain free for existing customers vs. spend a paid enrichment credit.

## Auth — Secret API Key

Clearbit Dashboard → API → Secret API Key. Sent as HTTP Basic with the key as the **username** and
an **empty password** (`Authorization: Basic base64("<key>:")`) — exactly what the official SDK's
HTTP client does on every request.

| Field | Type | Notes |
|---|---|---|
| `apiKey` | secret | The Secret API Key. |

### Auth `test`

`GET company.clearbit.com/v1/domains/find?name=Clearbit`. Chosen deliberately: per Clearbit's Help
Center FAQ, Name to Domain is free for existing customers (no enrichment credit spent), unlike
Person/Company/Combined Enrichment which each cost a paid credit per match — so a connection test
(and the `quota` health check, which reuses this exact probe) never burns the account's paid quota
just to prove the key works. A `404` ("no domain found") still means the key authenticated —
`auth_required` (`401`) is the only response that means the credential itself is bad.

## Two structurally different delivery modes — and why this app always picks one of them

Clearbit's Person/Company/Combined Enrichment endpoints have **two delivery modes**, selected by
which host you call:

| | Plain host (`person.clearbit.com`) | Streaming host (`person-stream.clearbit.com`) |
|---|---|---|
| Slow/uncached lookup | `202 Accepted` — result delivered later via webhook, or you must poll | Blocks and resolves the same request synchronously |
| Needs | A registered webhook endpoint, or a polling loop | Nothing — one request, one response |

A w6w Action is a single, stateless `ctx.fetch` call with no way to receive a webhook and no
supervising process to poll from. So this app **always** addresses the `-stream` variant for Person,
Company and Combined Enrichment — confirmed as the documented, real mechanism for exactly this
constraint by both the official SDK's `stream: true` client option and n8n's own production
implementation (which calls `person-stream/company-stream` for the same reason). A `202` response is
still possible in principle and is surfaced as a clear error (`lib/client.ts`) rather than silently
hanging, but in practice `-stream` avoids it for the overwhelming majority of lookups.

## Actions

| Key | Type | Endpoint | Costs a credit? |
|---|---|---|---|
| `enrich-person` | read | `GET person-stream.clearbit.com/v2/people/find` | Yes |
| `enrich-company` | read | `GET company-stream.clearbit.com/v2/companies/find` | Yes |
| `enrich-combined` | read | `GET person-stream.clearbit.com/v2/combined/find` | Yes |
| `company-name-to-domain` | read | `GET company.clearbit.com/v1/domains/find` | No — free for existing customers |
| `autocomplete-company` | search | `GET autocomplete.clearbit.com/v1/companies/suggest` | No — no credential needed at all |
| `prospector-search` | search | `GET prospector.clearbit.com/v1/people/search` | Yes |
| `prospector-reveal-email` | read | `GET prospector.clearbit.com/v1/people/{id}/email` | Yes |
| `reveal-company-by-ip` | read | `GET reveal.clearbit.com/v1/companies/find` | Yes |
| `calculate-risk` | perform | `POST risk.clearbit.com/v1/calculate` | No — free for existing customers |

Notes on what was deliberately left out:

- **Discovery API** (`POST discovery.clearbit.com/v1/companies/search`, company search by an
  arbitrary query DSL) exists in the official SDK, but its query language is not documented anywhere
  this app's research could verify beyond a single `{name: "..."}` example in the SDK's own test
  suite. Rather than invent filter fields for a DSL nobody currently documents, it is left out.
- **Watchlist API** (sanctions/PEP/adverse-media screening) is a genuinely different product
  (compliance/AML, not sales-and-marketing enrichment) and out of scope for this app.
- **Risk `flag`** (`POST risk.clearbit.com/v1/flag`, marking a past risk verdict as
  confirmed-fraud/confirmed-legitimate feedback) is a real endpoint in the SDK but a narrow
  feedback-loop operation on top of `calculate-risk`; left out to keep the action set focused.
- `autocomplete-company` is the one action with `requiresAuth: false` — Clearbit's own docs describe
  it as free and keyless, confirmed live (see "The HubSpot acquisition" above).

## Health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `health/service.ts` — Atlassian Statuspage at `status.clearbit.com` |
| `quota` | quota | connection | signed | informational | `health/quota.ts` — `x-ratelimit-*` headers off the free name-to-domain probe |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

`quota` reads Clearbit's per-key **request-rate** headroom (documented historically as 600
requests/minute per API family), not the separate, unmetered **enrichment-credit** balance that
HubSpot's Breeze Intelligence billing now tracks — Clearbit publishes no header or endpoint for the
latter, so this check can only speak to request-rate headroom.


## Icon

`assets/icon.svg` — the vendor's own mark; the previous one was a square-cut approximation.

Taken from <https://www.clearbit.com/logo.svg> on 2026-08-15.

- **1,931 bytes**, `image/svg+xml`, md5 `ec769ea15fcfe6f025e528aed070d418`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-01 against Clearbit's official `clearbit-node` SDK source
and test fixtures (`github.com/clearbit/clearbit-node`), n8n's production Clearbit node
(`n8n-io/n8n`), Clearbit's Help Center FAQ, and live, unauthenticated probes of every host this app
calls. `dashboard.clearbit.com/docs` no longer serves public documentation as of this writing —
re-verify against the SDK source or a live probe before trusting anything here that isn't backed by
one of those two.
