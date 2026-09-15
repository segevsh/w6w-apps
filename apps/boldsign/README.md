# BoldSign

Send documents out for signature, track their status, download the signed PDF and its audit
trail, nudge pending signers, revoke a document, mint an embedded signing link, and send from a
template — against **BoldSign's REST API**.

> **Auth:** API Key (`X-API-KEY` header) — one method, `api-key`
> **Categories:** legal, documents, productivity
> **API:** `https://api.boldsign.com/v1` (US, default), or a regional sibling — `api-eu`, `api-ca`,
> `api-au` — chosen at connect time

---

## Everything here was read off BoldSign's own OpenAPI contract

`https://api.boldsign.com/swagger/v1/swagger.json` (OpenAPI 3.0, "BoldSign API" v1) is the
machine-readable spec BoldSign's own client-library generator uses, fetched and cross-checked live
against `api.boldsign.com` on 2026-09-15. Every path, parameter and response field this app uses
comes from that document; nothing is inferred from a naming pattern.

## Four regions, not one host

BoldSign's docs (`api-overview/versioning`) name four independent API hosts:

| Region | Host |
|---|---|
| United States (default) | `api.boldsign.com` |
| Europe | `api-eu.boldsign.com` |
| Canada | `api-ca.boldsign.com` |
| Australia | `api-au.boldsign.com` |

An account — and the API keys it issues — lives on exactly **one** of these; they are not
environments of one account the way a sandbox/live toggle would be. This app collects the region
as a connect-time field (`apiHost`) rather than hardcoding the US host, and every action, plus the
`service` health check, reads it back off the Connection.

## Auth

**API Key** — `authentication/api-key` documents this as BoldSign's "basic authentication
mechanism," an alternative to OAuth2 for a server-to-server integration:

```
X-API-KEY: <key>
```

Generated from the BoldSign app: **API → API Key → Generate API Key**. By default a key carries
every scope (BoldSign's docs: "this is not customizable"). This app collects two fields — **API
Region** and **API Key** — and stamps the header on every request via `sign`.

**OAuth2 (authorization-code + PKCE) is deliberately not implemented.** BoldSign fully documents
it — `account.boldsign.com/connect/authorize`, real scopes, a working PKCE flow — so this is a
scoping choice, not a missing capability: API Key is the simpler credential every action in this
app needs, with one connect step and no redirect URI to register anywhere. A future revision could
add `oauth2` as a second Auth method (an App may declare several; a user picks one per Connection)
without touching anything here.

**Credential liveness (`test`) and the API-credit balance (`quota` health check, and the
`plan-api-credits` action) all read `GET /v1/plan/apiCreditsCount`** — chosen the same way this
pack's `apify` app picks `/users/me/limits` over `/users/me`: account metadata, no resource scope
a narrowly-scoped key might lack (moot here since every key carries every scope, but future-proof),
and no data in the response that wasn't already the caller's own.

## Finding #1 — a live 401 for a bad/missing key carries **no body at all**

The OpenAPI contract documents a JSON error body (`ErrorResult` — `{"error": string}`, or
`ErrorResponse` — `{"errorType", "error"}`) on every non-2xx response. Verified live 2026-09-15,
that is true for a request BoldSign actually **routes**:

```
GET /v1/does-not-exist                          (bad route, bad key)
  -> 404 {"error":{"message":"Unrecognized request URL …","type":"invalid_request_error"}}
```

But a request rejected purely for **authentication** — a missing or invalid `X-API-KEY` on an
otherwise-real route — answers **401 with `content-length: 0`**: no body, not even `{}`.

```
GET /v1/document/list?Page=1&PageSize=1  -H 'X-API-KEY: invalid-test-key-123'
  -> 401, empty body

GET /v1/plan/apiCreditsCount  -H 'X-API-KEY: invalid-test-key-123'
  -> 401, empty body
```

This app's error classifier (`lib/client.ts`) and the `api-key` Auth's `test` hook both read a body
only when BoldSign actually sent one, and fall back to the HTTP status otherwise — asserting a body
exists on every non-2xx response would throw on the exact response this app is trying to classify.

## Finding #2 — rate-limit headers exist, but the limiter appears to run *after* auth

`api-overview/rate-limit` documents 2000 requests/hour (a live key) or 50/hour (a sandbox key) per
account, "tracked in the API response headers," without naming them. Measured live 2026-09-15
against `api.boldsign.com` with an invalid key:

| Request | Status | `x-rate-limit-*` headers present? |
|---|---|---|
| `GET /v1/does-not-exist` (unknown route) | 404 | **Yes** — `x-rate-limit-limit: "1h"`, `x-rate-limit-remaining: "1804"`, `x-rate-limit-reset: <ISO 8601>` |
| `GET /v1/document/list` (real route, bad key) | 401 | No — none at all |
| `GET /v1/plan/apiCreditsCount` (real route, bad key) | 401 | No — none at all |

That is backwards from the naive assumption ("headers show up once you're past the gate"): a
request that never gets past the API-key check carries no quota signal, while one that fails
*routing* — after, apparently, running through a rate-limiter that does not itself require a valid
key — does. This app could not confirm the headers survive onto a **successful, signed** response
(no live BoldSign account was available to verify against during development), so `health/quota.ts`
is declared `severity: "informational"` and reports `unknown` — never `down` — whenever a signed
call carries none of them. `x-rate-limit-limit`'s value is a duration label (`"1h"`), not the
numeric ceiling, so it is carried in the report's `message`, not `HealthQuota.limit`.

## Finding #3 — no real multipart upload is possible from inside an Action here, and BoldSign's own schema already has the escape hatch

This pack's Actions run in a sandbox whose `ctx.fetch` stringifies every request body on its way to
the network. BoldSign's `POST /document/send` (and `/template/send`) both document `files` (a real
`multipart/form-data` upload) **and** `fileUrls` (an array of public HTTPS URLs BoldSign fetches
server-side) as alternative ways to supply content — unlike some peers in this pack (`signnow`),
which have no such alternative and simply cannot originate a new upload. `document-send` and
`template-send` use `fileUrls` exclusively; the document(s) must already be reachable at a URL
(already inside BoldSign, or hosted elsewhere over HTTPS).

## Vendor status

[Atlassian Statuspage](https://status.boldsign.com/api/v2/summary.json) — genuinely claimed
(`page.name: "BoldSign"`), verified live 2026-09-15. Each region has its own component, and
unusually helpfully, the component's `description` field is **literally the API hostname it
covers** (`api.boldsign.com`, `api-eu.boldsign.com`, …), so `health/service.ts` matches on that
field rather than parsing a display name that could get renamed. `scope: "connection"` — the same
shape this pack's `cloudinary` app uses for its own per-datacenter status page — because the
region is part of the credential, and a check that watched every region and reported the worst
would misreport three-quarters of connections whenever only one region has trouble.

## Not implemented

- **Contact groups, custom fields, brands, teams, users, sender identities and identity
  verification.** Each is a separate account/admin surface with its own configuration, not a
  document-workflow step — the same reasoning `signnow` and `docusign` apply to their own admin
  surfaces in this pack.
- **Signature field placement** (`FormField` bounds/page coordinates). Left to BoldSign's own
  editor and template designer.
- **A direct file upload.** See Finding #3.
- **OAuth2.** See "Auth" above.

## Actions

| Key | Type | What |
|---|---|---|
| `document-send` | perform | Send file(s) (by URL) out for signature |
| `document-list` | search | List the account's documents |
| `document-properties` | read | A document's status, signers and history |
| `document-download` | read | Download a document's PDF, base64-encoded |
| `document-download-audit-log` | read | Download the signing audit trail PDF, base64-encoded |
| `document-remind` | perform | Email pending signers a reminder |
| `document-revoke` | perform | Cancel a document that hasn't completed |
| `document-get-embedded-sign-link` | perform | Mint an embeddable signing URL for one signer |
| `template-list` | search | List the account's templates |
| `template-properties` | read | A template's roles, files and settings |
| `template-send` | perform | Create + send a document from a template, filling its roles |
| `plan-api-credits` | read | The account's purchased API-credit balance |

## Health checks

| Key | Kind | Scope | What |
|---|---|---|---|
| `service` | service | connection | This connection's region's API component, from Statuspage |
| `quota` | quota | connection | `x-rate-limit-remaining`/`-reset`, read opportunistically (see Finding #2) |
| `auth:api-key` (derived) | credential | connection | `GET /v1/plan/apiCreditsCount` succeeds |

## Icon

BoldSign has no listing on [simple-icons](https://cdn.simpleicons.org/boldsign) (`404`, confirmed
2026-09-15). `assets/icon.svg` embeds the vendor's own favicon PNG
(`https://boldsign.com/wp-content/uploads/2023/09/favicon-150x150.png`, 150×150) as a raster
`<image>`, the same fallback this pack uses for `bannerbear`, `blandai` and others whose vendor
publishes no vector mark.
