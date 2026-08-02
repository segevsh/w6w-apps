# Reddit

Submit and read posts and comments, vote, search, and look up the connected
account's identity on Reddit — the OAuth-authenticated Reddit API
(`oauth.reddit.com`).

- **Categories** — social-media
- **Auth methods** — oauth2
- **Actions** — 8
- **Egress allowlist** — `oauth.reddit.com`, `www.reddit.com`
- **Website** — https://www.reddit.com
- **API docs** — https://www.reddit.com/dev/api

Ported from n8n's `Reddit.node.ts` for the operation set, then re-verified
endpoint-by-endpoint against Reddit's own
[`reddit-archive/reddit` wiki](https://github.com/reddit-archive/reddit/wiki)
(Reddit's canonical, if informal, API reference) on 2026-07-31.

## Setup

1. Register a Reddit app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps),
   type **"web app"**.
2. Configure that app's `client_id` / `client_secret` / `redirect_uri` on this
   w6w installation (`PUT /apps/io.w6w.reddit/oauth-config/oauth2` — this
   package never holds those values).
3. **Set a real `User-Agent`.** See [User-Agent](#user-agent) below — this is
   not optional, and the shipped default is a placeholder.
4. Connect an account through the standard w6w OAuth flow.

## Auth

**`oauth2`** — Authorization Code flow. Reddit's flow authenticates the
token endpoint with the app's `client_id`/`client_secret` (HTTP Basic) and
documents no PKCE parameters anywhere in its OAuth2 wiki page or in other
OAuth clients (n8n, PRAW) — `pkce` is set to `false` explicitly rather than
left at the spec's `true` default, the same call this pack's Notion Auth
makes for the same reason.

| | |
|---|---|
| Authorize URL | `https://www.reddit.com/api/v1/authorize` |
| Token URL | `https://www.reddit.com/api/v1/access_token` |
| Scopes | `identity` `read` `submit` `vote` |
| Extra authorize param | `duration=permanent` |

`duration=permanent` is required at authorize time or Reddit issues an
access token only, with **no refresh token** in the response at all — it's
not a scope, so it goes in `extraAuthParams`. Renewal itself is the standard
`grant_type=refresh_token` request against the same token endpoint
(`refreshUrl` is declared explicitly even though it equals `tokenUrl` and
would default to it, so the renewal path is visible without reading the
spec).

Scopes are the minimum this app's actions need — not Reddit's full list,
which also includes `edit`, `history`, `mysubreddits`, `save`, `subscribe`,
`flair`, `report`, `privatemessages`, `wikiread`/`wikiedit`, and the
`mod*` family, none of which any action here uses.

Both the authorize host (`www.reddit.com`) and the token host
(`www.reddit.com`) are OAuth endpoint hosts, allowed implicitly per the App
spec. `www.reddit.com` is still listed in `w6w.network.allow` below as an
explicit, defensive restatement — no action hook calls it directly; every
signed request after connecting goes to `oauth.reddit.com` (see
[Egress](#egress)).

## User-Agent

**Reddit rejects generic or missing `User-Agent` strings**, and rate-limits
default HTTP-client User-Agents (`Python/urllib`, `Java`, …) far harder than
a descriptive one — this applies to every request, authenticated or not.
The documented format
([reddit-archive/reddit wiki, "Rules"](https://github.com/reddit-archive/reddit/wiki/API#rules),
checked 2026-07-31) is:

```
<platform>:<app ID>:<version string> (by /u/<reddit username>)
```

This app's `auth/oauth2.ts` `sign` hook sets it on every request to:

```
web:io.w6w.reddit:v0.1.0 (by /u/w6w-io)
```

**`w6w-io` is a placeholder, not a verified Reddit account.** Reddit's rule
exists to attribute traffic to a real, reachable developer — an operator
standing this app up for real traffic should replace the constant in
`lib/client.ts` (`USER_AGENT`) with the Reddit username of the account that
owns the registered Reddit app (the `client_id` from Setup step 1) before
relying on it in production. Never spoof a browser or another bot's
User-Agent — Reddit's rules call this out explicitly as grounds for a ban.

## Actions

| Key | Type | Endpoint | Scope |
|---|---|---|---|
| `post-submit` | perform | `POST /api/submit` | submit |
| `post-get` | read | `GET /api/info?id=t3_<id>` | read |
| `post-list` | search | `GET /r/<subreddit>/<sort>.json` | read |
| `post-search` | search | `GET /search.json` or `GET /r/<subreddit>/search.json` | read |
| `post-vote` | perform | `POST /api/vote` | vote |
| `comment-list` | search | `GET /r/<subreddit>/comments/<postId>.json` | read |
| `comment-submit` | perform | `POST /api/comment` | submit |
| `identity-get` | read | `GET /api/v1/me` | identity |

Endpoints verified against
[`reddit-archive/reddit/wiki/API`](https://github.com/reddit-archive/reddit/wiki/API)
on 2026-07-31.

### Write endpoints are form-encoded, not JSON

Reddit's `/api/*` write endpoints (`submit`, `comment`, `vote`) expect
`application/x-www-form-urlencoded` bodies, unlike most modern JSON APIs in
this pack (Twitter, Notion, …) — `lib/client.ts#RedditClient` handles this
uniformly so no action re-implements it.

### Errors can come back with HTTP 200

`/api/submit` and `/api/comment` return `200` with the error inside
`json.errors` (a `[code, message, field]` tuple array) rather than a non-2xx
status for validation failures — `RedditClient` checks for this on every
response and throws, so a caller only ever sees a rejected promise either
way.

### `post-get` vs. n8n's `post: get`

n8n's node fetches a post via
`GET /r/<subreddit>/comments/<postId>.json` and reads only the post half of
that response. This app instead uses
[`GET /api/info?id=t3_<id>`](https://github.com/reddit-archive/reddit/wiki/API#GET_api_info),
which needs no subreddit and is the endpoint documented specifically for
"fetch this one thing by id".

### Not implemented

- **Post/comment deletion, editing, saving, subreddit subscription,
  moderation.** n8n's node covers post/comment delete; none of these were
  requested. Same shape as the actions above to add later (`edit` scope for
  delete/edit, `save` for saving, `subscribe` for subscribing).
- **Recursive comment-tree walking.** `comment-list` returns only
  **top-level** comments — a real reply thread's nested `replies` field
  (and Reddit's `more`/`MoreChildren` continuation objects for deep threads)
  is a meaningfully bigger surface, left for a follow-up.
- **Subreddit "about" / user "about" lookups.** n8n also exposes a
  `subreddit` resource (about, rules, trending) and a fuller `user` resource
  (posts, comments, karma, trophies) beyond the acting user's own identity;
  neither was in this app's requested action set.

## Access tiers / rate limits (current as of 2026-07-31 — verify before relying on this)

Reddit's Data API has been a paid product since 2023 for commercial use.
Published terms at the time of writing: **free** for non-commercial use
(personal projects, bots, research) with self-service OAuth client
registration; **commercial** use needs Reddit's approval and a paid
agreement. OAuth-authenticated requests share a **60 requests/minute**
budget per OAuth client (see [Health check](#health-check) below for how
this app reads that budget's live headroom). These figures come from
Reddit's own historical OAuth2 wiki page plus third-party developer
write-ups current as of research time, not a single authoritative pricing
page — **check the Reddit Developer Platform console for this app's actual
tier and current rate before assuming a number** for a production
deployment.

## Health check

Three different questions get confused with each other, so this section
keeps them apart: is the *vendor* up, is *this credential* live, and do we
have *quota* left.

### Is the vendor up?

Reddit runs an Atlassian-Statuspage-backed status page at
[redditstatus.com](https://www.redditstatus.com), with a documented JSON API
— `GET /api/v2/summary.json` returned a live response with 12 components
(Desktop Web, Mobile Web, Native Mobile Apps, reddit.com, Reddit Ads, Reddit
Infrastructure, Vote Processing, Comment Processing, Spam Processing,
Modmail, Reddit Media Storage, ads.reddit.com) when checked 2026-07-31.
Unlike X (see this pack's `twitter` app, which declares its status check
`unavailable`), this is a real, machine-readable feed, so the declared
`service` check probes it directly rather than declaring an absence.

`www.redditstatus.com` is a status host, not an API host, so per
[`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md)
it is **not** added to `w6w.network.allow` — it's scoped to just this
check's own `network.allow`, reachable by this one hook and nothing else.

### Is this credential live?

The Auth `test` hook — `GET /api/v1/me` with the stored bearer token. This
is the app's own health check, derived automatically as `auth:oauth2`.

### Do we have quota left?

Reddit documents `X-Ratelimit-Used` / `X-Ratelimit-Remaining` /
`X-Ratelimit-Reset` on every OAuth response, shared as **one bucket per
OAuth client** rather than X's per-endpoint 15-minute windows. The declared
`quota` check reads those headers off `GET /api/v1/me` (the cheapest
authenticated call this app already needs) — because Reddit shares one
bucket app-wide, this single probe is a meaningful whole-app reading, not
just one endpoint's.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` (`GET www.redditstatus.com/api/v2/summary.json`) |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` (`GET /api/v1/me` headers) |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

## Egress

`w6w.network.allow` declares `oauth.reddit.com` (every action, and the
`quota`/derived-`auth` checks) and `www.reddit.com` (Reddit's OAuth
authorize + token host, restated defensively — already implicit for a
`type: "oauth2"` Auth). `www.redditstatus.com` is **not** in the App-level
allowlist; it's scoped to the `service` health check's own `network.allow`
only, per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md)
("status hosts are not API hosts").

---

Researched and endpoint-verified 2026-07-31 against
`github.com/reddit-archive/reddit/wiki` and `redditstatus.com`. Reddit's API
surface, access tiers, and pricing have moved substantially in recent years
— re-verify before relying on anything above if it has been a while.
