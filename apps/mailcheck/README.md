# Mailcheck

Verify single or bulk email addresses via the [Mailcheck](https://mailcheck.co) API.

- **Categories** — email, marketing
- **Auth methods** — api-key (Bearer JWT)
- **Actions** — 4
- **Egress allowlist** — `api.mailcheck.co`
- **Website** — https://mailcheck.co
- **API docs** — https://app.mailcheck.co/docs

## Vendor identification

n8n's `Mailcheck` node (`packages/nodes-base/nodes/Mailcheck/`) calls `https://api.mailcheck.co/v1`
with `Authorization: Bearer <apiKey>` — the SaaS at [mailcheck.co](https://mailcheck.co) ("Online
email verification tool. Bulk check and cleaning"), **not** the unrelated open-source client-side
typo-detection library of the same name. Confirmed live 2026-08-01:

- `mailcheck.co` and `api.mailcheck.co` both resolve and respond (Cloudflare-fronted).
- `https://app.mailcheck.co/openapi.json` is the vendor's own, currently-served OpenAPI 3.0.3
  document — title `mailcheck`, `servers: [{ url: "https://api.mailcheck.co" }]`, four paths under
  the `email` tag. This is the ground truth this app is built from.
- An unauthenticated `POST /v1/singleEmail:check` returns `401` with
  `"JWT validation failed: Missing or invalid credentials"`, confirming the auth scheme documented
  in the spec (`securitySchemes["API key"]`: `{ type: "http", scheme: "bearer", bearerFormat: "JWT" }`).

## Actions

| Action | Endpoint | Type | Notes |
|---|---|---|---|
| Check Email | `POST /v1/singleEmail:check` | `read` | Synchronous single-address check. Returns `trustRate`, `mxExists`, `smtpExists`, `isNotSmtpCatchAll`, `isNotDisposable`, plus best-effort `gravatar`/`githubUsername`/`facebook` identity hits. |
| Create Batch Check | `POST /v1/emails:check` | `perform`, `idempotent: false` | Starts an async operation over a list of addresses; each call is billable and creates a new job. |
| Get Batch Operation | `GET /v1/emails/{operation_name}` | `read` | Poll a batch operation's `done`/`result` by the `name` a create or list call returned. |
| List Batch Operations | `GET /v1/emails/operations` | `read` | Paginated list of this account's batch operations. |

All four are exactly the paths in the vendor's OpenAPI document — nothing here is inferred or
invented.

## Auth

**API Key** (`bearer`) — a JWT minted in the API section of the Mailcheck dashboard
(`https://app.mailcheck.co`, documented at `https://mailcheck.co/create-api-key`), sent as
`Authorization: Bearer <token>`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared `unavailable`.** Mailcheck publishes no status page or feed that this app could verify:

- `mailcheck.co`'s marketing site links no status page.
- `mailcheck.statuspage.io` redirects to Atlassian's generic Statuspage marketing site (not a
  Mailcheck-branded page) — the hosted-Statuspage subdomain is unclaimed.
- `mailcheck.instatus.com` serves Instatus's generic "get ready for downtime" placeholder — same
  story, unclaimed.
- Neither serves a `/feed.rss` or `/feed.atom`.
- The vendor's own OpenAPI document lists no status endpoint.

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md),
"say so when a vendor publishes nothing" — `health/service.ts` declares `unavailable` with that
reasoning rather than fabricating a probe.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /v1/emails/operations?page_size=1
```

Lists (at most one) batch operation. Chosen because it is the only documented endpoint that reads
rather than spends a per-address verification credit, mirroring how other apps in this pack pick
the cheapest free call available for credential liveness.

### Do we have quota left?

**Not modeled.** The vendor exposes no credits/quota endpoint and the API returns no
`x-ratelimit-*` (or equivalent) response headers on any call, authenticated or not — verified by
inspecting live response headers. Rather than guess at a mechanism, no `quota` check is declared.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `unavailable` — no hook |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-01 against the vendor's live OpenAPI document
(`https://app.mailcheck.co/openapi.json`) and direct requests to `api.mailcheck.co`. Status
surfaces move; re-check if a probe starts failing for everyone at once.
