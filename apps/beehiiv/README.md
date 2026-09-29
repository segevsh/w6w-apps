# beehiiv

Manage beehiiv publications, posts and subscriptions — read publications, create/update/read/
list/delete posts through the Send API, and create/read/list/update subscriptions.

- **Categories** — email, marketing, cms
- **Auth methods** — api-key (bearer)
- **Actions** — 12
- **Egress allowlist** — `api.beehiiv.com`
- **Website** — https://www.beehiiv.com
- **API docs** — https://developers.beehiiv.com/ · schema: beehiiv's own OpenAPI 3.0.1 export
  (`.ai/apps/docs/beehiiv - OpenAPI Specification.yaml`, ~23k lines, `info.title` "Beehiiv API")

Every path, field name, enum and error shape in this app comes from that document, cross-checked
against live probes against `api.beehiiv.com` and `www.beehiivstatus.com` on 2026-09-29. No sibling
app or marketing page was used to infer anything.

## Setup

### API Key

1. beehiiv → **Settings → Integrations → API**, then Create/Generate an API Key.
2. The key is copied once — it grants access to **every publication in the workspace**. beehiiv
   documents no narrower, per-publication credential.

The key is sent as `Authorization: Bearer <key>`, confirmed from the spec's own
`components.securitySchemes` (a single `BearerAuth: {type: http, scheme: bearer}`).

### One host, one version prefix

The spec declares exactly one server: `https://api.beehiiv.com/v2`. There is no regional host and
no sandbox environment.

### beehiiv does not distinguish "no key" from "wrong key"

Measured live: a request with no `Authorization` header and one with a syntactically plausible but
fake bearer token both answer

```json
401 {"errors":[{"code":"INVALID_API_KEY","message":"The api key is not valid"}]}
```

word for word identical. `auth/api-key.ts`'s `test` hook reports that fact in its message rather
than pretending it can tell the two apart, and never echoes the credential itself back.

## Actions

| Key | Type | Calls |
|---|---|---|
| `publication-list` | read | `GET /publications` |
| `publication-get` | read | `GET /publications/{id}` |
| `post-list` | read | `GET /publications/{id}/posts` |
| `post-get` | read | `GET /publications/{id}/posts/{id}` |
| `post-create` | perform | `POST /publications/{id}/posts` |
| `post-update` | perform | `PATCH /publications/{id}/posts/{id}` |
| `post-delete` | perform | `DELETE /publications/{id}/posts/{id}` |
| `subscription-list` | read | `GET /publications/{id}/subscriptions` |
| `subscription-get` | read | `GET /publications/{id}/subscriptions/{id}` |
| `subscription-get-by-email` | read | `GET /publications/{id}/subscriptions/by_email/{email}` |
| `subscription-create` | perform | `POST /publications/{id}/subscriptions` |
| `subscription-update` | perform | `PATCH /publications/{id}/subscriptions/{id}` |

Every path but `publication-list` is nested under a `publicationId` — there is no other way to
scope a request, and `publication-list` is how a workflow discovers that id in the first place.

## Notes worth knowing before wiring a workflow

- **Post creation and update are asynchronous.** `post-create`/`post-update` return `201`/`200`
  with a stable `id` immediately, but the post may still be building in the background.
  `post-get`/`post-update` themselves can also answer `202` while building — surfaced as a
  `processing: true` output rather than the finished post. If background creation fails for good,
  beehiiv answers `404 POST_CREATION_FAILED` — a **permanent** failure `post-get` throws rather than
  hides, since retrying the same read will never succeed.
- **`post-delete` behaves differently by status.** A **draft** post is permanently deleted
  (`204`); a **confirmed** post is archived instead (its `status` becomes `archived`, `204`). Either
  can also answer `202` while the delete/archive is still applying in the background.
- **Two pagination shapes, not one.** Every list endpoint but subscriptions uses offset pagination
  (`page`/`limit`, plus `total_pages`/`total_results` in the response). `subscription-list` is the
  **only** cursor-paginated endpoint in the whole API — the vendor's own spec deprecates offset
  paging there and caps it at 100 pages; pass a previous response's `next_cursor` back in as
  `cursor` to page past that ceiling. `subscription-list`'s own `cursor` param takes priority over
  `page` when both are set.
- **Array-valued filters are repeated query keys, not comma-joined.** `content_tags[]`, `slugs[]`,
  `authors[]`, `expand[]`, `premium_tiers[]`, `premium_tier_ids[]` are all sent as `?key[]=a&key[]=b`
  — every Action's own comma-separated string param is split and re-encoded that way by
  `lib/params.ts`'s `bracketQuery`.
- **`post-create`/`post-update` accept `bodyContent` (raw HTML) OR `blocks` (beehiiv's structured
  content JSON), never both** — providing both is rejected before any request is sent. Raw HTML is
  sanitized on save: `<style>` and `<link>` tags are stripped, so use inline styles.
- **`subscription-create`'s `newsletterListIds` on update *adds* to existing list memberships, it
  does not replace them**, and cannot be combined with `unsubscribe` on the same call.

## Errors are a structured array, not a flat message

Every failure is `{"status", "statusText", "errors": [{"message", "code"}]}` with a matching 4xx/5xx
HTTP status. `code` is a stable machine token (`INVALID_API_KEY`, `POST_CREATION_FAILED`, …) and is
surfaced in every thrown error message, because the fix differs per code and a flattened "HTTP 401"
hides which one it was.

## Health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` — `www.beehiivstatus.com` |
| `quota` | quota | — | — | informational | — | _declared absent_ |
| `auth:api-key` (derived) | credential | connection | signed | fatal | — | `auth/api-key.ts`'s `test` hook |

### Is the vendor up?

**Yes, and it is real — verified three ways live 2026-09-29.** `status.beehiiv.com` redirects to
**`www.beehiivstatus.com`**, an Atlassian Statuspage — not the unclaimed `beehiiv.statuspage.io`
decoy, which 302s straight to Atlassian's own marketing page instead. `www.beehiivstatus.com/api/v2/summary.json`
answers `200 application/json`, self-identifies as `page.name: "beehiiv"`, and lists real,
product-specific components including one literally named **"Public API"** — the exact surface this
app calls — alongside `Publication websites`, `App Admin`, `MCP`, `Sending emails`, `Email Metrics`,
`Embed forms`, and the upstream `SendGrid API v3`/`SendGrid Event Webhook` beehiiv sends mail
through. `health/service.ts` reads the page-level roll-up for the overall verdict and names any
affected component by status in the message.

### Is this credential live?

The Auth `test` hook, projected automatically into the health surface as `auth:api-key`:

```
GET /publications?limit=1
```

Chosen because it is the one endpoint every API key can reach regardless of which publications it
was issued for (no publication-scoped credential to worry about being refused), and its response
carries no secret — publication name, org name, stats, nothing that echoes the caller's own key.

### Do we have quota left?

**Not knowable.** beehiiv's OpenAPI document names a `429` on every endpoint but documents no
`X-RateLimit-*`/`RateLimit-*` header, and none was present on a live probe (both an unauthenticated
request and one with a fake bearer token) against `api.beehiiv.com` on 2026-09-29. There is also no
account-level usage/quota endpoint documented anywhere in the spec. Declared `unavailable`,
`severity: "informational"` — an `unavailable` entry always reports `unknown`, and `unknown`
outranks `ok` in the roll-up, so any other severity would pin the app's verdict at `unknown`
forever. See `health/quota.ts`.

## What is deliberately left out

The Ad Network (beta, per the vendor's own spec), bulk subscription actions, automations/journeys,
newsletter lists, segments, custom fields, authors, polls, podcasts, premium tiers, complimentary
access, condition sets, data-privacy deletion requests, email blasts, engagements, subscriber
exports, the referral program, webhooks, post templates and publication fields, and every
workspace-scoped (cross-publication) endpoint (`/workspaces/*`). This app covers the surface a
workflow actually automates — publications, posts and subscriptions — not the entire ~90-endpoint
document; the rest is dashboard-managed configuration or beta/niche surface with no clear workflow
shape yet.

## Icon

`assets/icon.png` is the vendor's own favicon, linked from `<link rel="shortcut icon">` on
beehiiv.com's own homepage (`https://beehiiv-marketing-images.s3.amazonaws.com/Redesign2023/favicon.png`)
— fetched live and confirmed **byte-identical** (`md5sum`) to the file shipped here, 2026-09-29.
Earlier research recorded beehiiv as icon-blocked because every asset URL under `beehiiv.com`
answers a 9-byte 404 and the Fern docs bucket 403s a direct fetch — that block was about the *docs*
CDN, not the marketing site's own S3-hosted favicon, which this file's `<link>` tag on the live page
pointed to directly.

## Development

```bash
deno task validate   # pack conformance audit (manifest, sandbox rules, icon legibility, test coverage)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test        # 92 unit tests
```

Tests call every hook directly with a mocked `HookContext` (`tests/_helpers.ts`: a queued fake
`ctx.fetch`, a recording no-op `ctx.log`). An unqueued fetch throws, so a test that makes an
unexpected request fails rather than hanging. `INVALID_API_KEY_401` and `POST_CREATION_FAILED_404`
in that file are the live-measured error responses, reused everywhere those two failure modes are
asserted.
