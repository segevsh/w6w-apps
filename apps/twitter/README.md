# Twitter (X)

Post, delete, search and read tweets, look up users, and like/retweet on X
(formerly Twitter) — the X API v2 (`api.x.com`).

- **Categories** — social-media
- **Auth methods** — oauth2
- **Actions** — 8
- **Egress allowlist** — `api.x.com`

Ported from n8n's `Twitter.node.ts` (V2) for the operation set, then
re-verified endpoint-by-endpoint against `docs.x.com` on 2026-07-31, since
n8n's port predates both the `api.x.com` rebrand (`api.twitter.com` is the
pre-rebrand host and is treated as deprecated in current X docs, which use
`api.x.com` exclusively) and X's 2026 move to pay-per-use API pricing.

## Setup

1. Register an X App at [developer.x.com](https://developer.x.com) with
   **OAuth 2.0** enabled (Authorization Code flow, confidential or public
   client — either works with PKCE).
2. Configure that App's `client_id` / `client_secret` / `redirect_uri` on this
   w6w installation (`PUT /apps/io.w6w.twitter/oauth-config/oauth2` — this
   package never holds those values).
3. Connect an account through the standard w6w OAuth flow.

## Auth

**`oauth2`** — Authorization Code flow with **PKCE**, X's only supported
user-context auth for the v2 API. PKCE is required by X for this flow, not
just offered, so `pkce` is left at the spec's default of `true`.

| | |
|---|---|
| Authorization URL | `https://x.com/i/oauth2/authorize` |
| Token URL | `https://api.x.com/2/oauth2/token` |
| Scopes | `tweet.read` `tweet.write` `users.read` `like.write` `media.write` `offline.access` |

`offline.access` is requested so a refresh token comes back — X user access
tokens expire in **2 hours**, and X only issues a refresh token when this
scope is present at authorize time. Renewal itself is the standard
`grant_type=refresh_token` request against the same token endpoint
(`refreshUrl` is declared explicitly, even though it equals `tokenUrl` and
would default to it); no app-specific `refresh` hook is needed, the same
pattern every other OAuth2 App in this pack uses when the vendor's refresh
grant is unexceptional.

Both the authorize host (`x.com`) and the token host (`api.x.com`) are OAuth
endpoint hosts, allowed implicitly — neither is restated in
`w6w.network.allow`.

## Actions

| Key | Type | Endpoint | Scopes |
|---|---|---|---|
| `tweet-create` | perform | `POST /2/tweets` | tweet.read, tweet.write, users.read (+ media.write if media attached) |
| `tweet-delete` | perform | `DELETE /2/tweets/:id` | tweet.read, tweet.write, users.read |
| `tweet-get` | read | `GET /2/tweets/:id` | tweet.read, users.read |
| `tweet-search-recent` | search | `GET /2/tweets/search/recent` | tweet.read, users.read |
| `tweet-like` | perform | `GET /2/users/me` then `POST /2/users/:id/likes` | tweet.read, users.read, like.write |
| `tweet-retweet` | perform | `GET /2/users/me` then `POST /2/users/:id/retweets` | tweet.read, tweet.write, users.read |
| `user-get-by-username` | read | `GET /2/users/by/username/:username` | tweet.read, users.read |
| `user-get-tweets` | search | `GET /2/users/:id/tweets` | tweet.read, users.read |

Scopes are as documented at `docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping`
(checked 2026-07-31) for each endpoint.

`tweet-like` and `tweet-retweet` both scope to the *acting user's own* ID
rather than accepting one in the request — X's endpoint shape, not this app's
choice — so each action resolves `GET /2/users/me` first and then calls the
per-user endpoint. That is an extra billable read per like/retweet; see
Pricing below.

### Media on `tweet-create`

Media is optional. When supplied (as base64, ideally a `data:<mime>;base64,...`
URL), it goes through the v2 chunked media-upload endpoint
(`POST /2/media/upload`, INIT → APPEND → FINALIZE) as a **single chunk**
before being attached via `media.media_ids`. That covers images and GIFs; a
real multi-segment APPEND loop for large video uploads is a meaningfully
bigger surface (per-segment chunking, retry, longer `processing_info`
polling) and is **not implemented** — attempting a large video through this
action will likely exceed a single APPEND's practical size. FINALIZE's
`processing_info.state` is polled (bounded to 5 attempts) when X reports the
upload isn't done synchronously.

### Not implemented

- **Direct messages, Lists.** n8n's node covers both; neither was in this
  app's requested action set. Same shape as the actions above to add later.
- **Full-archive tweet search.** `tweet-search-recent` only reaches the last
  7 days (`/2/tweets/search/recent`); the full-archive endpoint needs
  additional access this app does not assume.
- **GitHub Enterprise-style self-hosting.** N/A — X has no self-hosted
  variant.

## Pricing / access-tier caveats (current as of 2026-07-31 — verify before relying on this)

X replaced its Free/Basic/Pro tiered model with **pay-per-use pricing** as
the default for new developer accounts in February 2026. Legacy Basic
($200/mo) and Pro ($5,000/mo) subscribers keep their existing tier; everyone
else pays per request from purchased credits, with **no general free
quota**. Published per-resource rates at the time of writing
(`docs.x.com/x-api/getting-started/pricing`):

| Operation | Rate |
|---|---|
| Post creation (`tweet-create`) | $0.015 / request, **$0.20** if the text contains a URL |
| Post read (`tweet-get`, `tweet-search-recent`, `user-get-tweets`) | $0.005 / resource |
| User read (`user-get-by-username`) | $0.010 / resource |
| Like read | $0.001 / resource |
| Post reads, monthly cap | 2,000,000 (Enterprise required beyond that) |

Whether `tweet-delete`, `tweet-like`, and `tweet-retweet` are separately
billed line items was not confirmed from public docs at research time —
**check the current rate card in the X Developer Console before assuming a
cost** for those three. A narrow carve-out for verified public-utility
accounts (government/public-safety) still gets free access; that does not
apply to a general-purpose integration like this one.

Given this, do not present any action here as "free" to an end user — the
credential's own X Developer Console billing page is the source of truth for
what an account is actually being charged.

## Health check

Three different questions get confused with each other, so this section
keeps them apart: is the *vendor* up, is *this credential* live, and do we
have *quota* left.

### Is the vendor up?

**Declared unavailable.** X's developer status page
(`developer.x.com/status`, formerly `api.twitterstat.us`) is a
human-readable dashboard; unlike GitHub's Atlassian-Statuspage-backed
`www.githubstatus.com` (`GET /api/v2/summary.json`) or a vendor publishing
Atom/RSS, no documented public JSON/Atom/RSS feed for it was found during
research (2026-07-31) — only the dashboard itself and developer-community
threads noting the page has been unreliable. Per
[`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md),
declaring the absence honestly (`unavailable`) beats guessing at an
undocumented endpoint.

### Is this credential live?

The Auth `test` hook — `GET /2/users/me` with the stored bearer token. This
is the app's own health check, derived automatically as `auth:oauth2`.

### Do we have quota left?

X has no aggregate rate-limit endpoint like GitHub's `/rate_limit`; every v2
response instead carries its own `x-rate-limit-limit` / `-remaining` /
`-reset` headers, scoped to *that endpoint's* 15-minute window
(`docs.x.com/x-api/fundamentals/rate-limits`). The declared `quota` check
reads those headers off `GET /2/users/me` (the cheapest authenticated call
this app already needs) and reports on that one bucket only — it is **not**
a global answer, and it is a **different** thing from the pay-per-use
dollar-credit balance above, which is not exposed anywhere in the API to
poll (console only).

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | none — `unavailable` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` (`GET /2/users/me` headers) |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

---

Researched and endpoint-verified 2026-07-31 against `docs.x.com`. X's API
surface, pricing, and status-page situation have all moved substantially in
the past two years — re-verify before relying on anything above if it has
been a while.
