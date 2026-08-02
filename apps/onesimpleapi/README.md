# OneSimpleApi

A toolbox of small utility APIs: page metadata, screenshots, PDFs, QR codes, email
validation, URL expansion, and currency conversion.

- **Categories** — developer-tools
- **Auth methods** — api-key
- **Actions** — 7
- **Egress allowlist** — `onesimpleapi.com`
- **Website** — https://onesimpleapi.com
- **API docs** — https://onesimpleapi.com/docs

## API surface

OneSimpleApi (onesimpleapi.com) publishes 16 documented utility endpoints under
`/api/*`. Base URL and auth are confirmed against the vendor's own live docs
(fetched from the Inertia page props on `/docs`, checked 2026-08-01):

```
Base URL:  https://onesimpleapi.com/api
Auth:      ?token=<token>   (query param — never a header)
```

Every request in this app also sends `output=json`, so responses are always
structured data rather than the vendor's plain-text/redirect/CSV/spreadsheet
output modes.

### The invalid-token quirk

OneSimpleApi does not answer a missing, invalid, or under-scoped token with a
JSON 401/403. It 302-redirects to `https://onesimpleapi.com/login`, and that
login page itself responds HTTP 200 with `text/html` — verified with
`curl -L` against `/api/exchange_rate?token=invalid`. `lib/client.ts` guards
against this by checking `content-type` before parsing: a JSON request that
comes back as anything other than `application/json` is treated as an error
regardless of HTTP status.

Tokens are also scoped per-feature in the OneSimpleApi dashboard
(`/user/api-tokens`) — a token missing a feature's toggle hits the same
redirect-to-login behavior as an invalid token, which this client cannot tell
apart from the outside.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*usage headroom* left.

### Is the vendor up?

**Declared `unavailable`.** onesimpleapi.com publishes no public status page:
`/status`, `/uptime`, `/statuspage`, `/api/status` all 404, `status.onesimpleapi.com`
fails to resolve, and the homepage carries no link to one. There is nothing
machine-readable to declare a `feed` against, so `health/service.ts` says so
honestly instead of faking a check or leaving a silent gap.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

```
GET /api/exchange_rate?to_currency=USD&output=json
```

Chosen because it is the cheapest documented read: a static currency lookup
that generates no cached resource (unlike screenshot/pdf/qr-code/image
endpoints) and needs only the "Exchange Rate" feature toggle on the token.

### Do we have usage headroom left?

**Declared `unavailable`.** OneSimpleApi tracks a usage percentage and a
monthly reset day, but that data is only exposed as server-rendered props on
the logged-in dashboard (Inertia.js `subscription` props — `api_percentage`,
`remaining`, `reset_day`), not through any of the 16 documented API endpoints
or a response header. There is nothing a side-effect-free API probe can read.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `unavailable` — no status page or feed |
| `quota` | quota | connection | signed | informational | `unavailable` — no usage endpoint or headers documented |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `get-page-info` | read | `GET /page_info` |
| `take-screenshot` | perform | `GET /screenshot` |
| `create-pdf` | perform | `GET /pdf` |
| `generate-qr-code` | perform | `GET /qr_code` |
| `validate-email` | read | `GET /email` |
| `expand-url` | read | `GET /unshorten` |
| `convert-currency` | read | `GET /exchange_rate` |

`take-screenshot`, `create-pdf`, and `generate-qr-code` are typed `perform`
because each call can generate/cache a new hosted resource on the vendor's
CDN, but all three are marked `idempotent: true`: the vendor reuses a
previously generated result for the same inputs by default (`force` opts out),
and QR encoding is a pure function of its inputs regardless of caching.

Output field names for endpoints without a documented `output=json` example
(`take-screenshot`, `create-pdf`, `generate-qr-code`, `expand-url`,
`convert-currency`) are inferred from the vendor's documented CSV column
names. This inference is grounded, not guessed: the Email Validation and Web
Page Information endpoints document both their CSV columns *and* a JSON
example side by side, and in both cases the JSON keys are exactly the
snake_cased CSV column names — the same correspondence is applied here.

### Deliberately not built

OneSimpleApi's `/docs` currently documents 16 endpoints; this app covers the
7 above, matching the description on the marketplace card. The rest were left
out of this pass as genuinely separate concerns, not because they're
undocumented:

- **Cache for APIs** (`/cache`) — a generic HTTP response cache, orthogonal to
  the "small utility APIs" surface the other 7 actions share.
- **Color and color palette generator** (`/color`) — real and documented, out
  of scope for this pass.
- **Image Information / EXIF** (`/image_info`) — real and documented, out of
  scope for this pass.
- **Image manager** (`/image_manager`) — a large resize/crop/CDN-delivery
  surface with its own extensive option set; out of scope for this pass.
- **Purchase Power Parity Discount Calculator** (`/discount_calculator`) — real
  and documented, out of scope for this pass.
- **Readability, Reading Time and Sentiment** (`/readability`) — real and
  documented, out of scope for this pass.
- **Spotify Profiles** (`/spotify_profile`) — the vendor's own docs mark this
  "Beta"; left out until it stabilizes.
- **URL Shortener** (`/shortener/*`) — a small CRUD surface (create/list/delete
  short links) rather than a single call; out of scope for this pass.
- **Web Page Status and Certificate information** (`/page_status`) — real and
  documented, out of scope for this pass.
- **Instagram Profile.** Present in the n8n community node
  (`GenericFunctions.ts` calls `/instagram_profile`), but **absent from the
  vendor's own current `/docs` listing** (checked 2026-08-01 against all 16
  documented endpoints) — not built here since it can no longer be confirmed
  live.
- **Favicon fetch.** No such endpoint appears anywhere in the vendor's current
  docs or the n8n node; not invented.

---

Researched and endpoint-verified 2026-08-01 directly against onesimpleapi.com's
own live documentation (the Inertia.js `docs` page-props on `/docs`, which
carry the full Markdown body for all 16 currently published endpoint guides)
and `curl`-verified request/response behavior. The vendor's usage/quota and
status surfaces are dashboard-only today; re-verify before wiring either
health check if a machine-readable option shows up later.
