# YouTube

Search YouTube and manage videos, playlists, comments and subscriptions through the YouTube Data
API v3.

- **Categories** — video, social-media
- **Auth methods** — oauth2, api-key
- **Actions** — 16
- **Egress allowlist** — `youtube.googleapis.com`
- **Website** — https://www.youtube.com
- **API docs** — https://developers.google.com/youtube/v3/docs

## Base URL

```
https://youtube.googleapis.com/youtube/v3
```

Both halves are load-bearing. The host is **`youtube.googleapis.com`** — that is the `rootUrl` in
the live discovery document — and `youtube/v3` is part of the **path**, not the host.

The `https://www.googleapis.com/youtube/v3` form seen in most third-party tutorials is a legacy
alias. It still resolves, but it is not what Google publishes, and `www.googleapis.com` is the
generic front door for *every* Google API. Putting it in `w6w.network.allow` would widen this app's
sandbox egress to all of Google for no benefit, so this app uses the dedicated host and allowlists
only that. `www.googleapis.com` does appear in `auth/oauth2.ts`, but only as the namespace Google's
OAuth scope *identifiers* are spelled in — it is never fetched.

## The `part` parameter

`part` is required on nearly every YouTube endpoint, and it is the single thing most worth
understanding before using this app. It does three jobs at once:

1. **It is mandatory.** Omitting it is a `400 missingRequiredParameter`, not a defaulted request.
2. **It selects the response shape.** A resource comes back with exactly the top-level sections you
   asked for and no others — `part=id` and `part=snippet,statistics` return genuinely different
   objects. A video's view count lives in `statistics`, its duration in `contentDetails`, its
   privacy in `status`; none appear unless named.
3. **On write methods it also selects what gets written** — see the warning below.

Every action here therefore models `part` as a real, required `multiselect` parameter with a
sensible default, drawn from that resource's documented value set (centralised in `lib/client.ts`
as `PARTS`). Nothing is hardcoded to one value.

Five actions expose no `part` parameter. Four of them — `delete-video`, `rate-video`,
`delete-playlist`, `remove-playlist-item` — call methods the API genuinely does not accept one on.
The fifth is `reply-to-comment`, where Google's own reference says *"Set the parameter value to
snippet"*; `comments` has only one other part, `id`, which would return a reply with no text, so
there is no meaningful choice to offer and offering one would only create a way to get a useless
response.

`lib/client.ts` normalises whatever the caller supplies — an array from the multiselect, or a
hand-typed comma string — trimming, de-duplicating and joining to the one comma-separated value the
API expects, and throwing locally if the result is empty rather than letting the request fail
server-side with a vaguer message.

### The write methods are destructive — there is no PATCH

Google, on `videos.update`: *"If you are submitting an update request, and your request does not
specify a value for a property that already has a value, the property's existing value will be
deleted."* That applies **per named part**, so `part=snippet` carrying only a new title silently
wipes the description and the tags.

`update-video` and `update-playlist` guard against the two ways this bites:

- A part is only sent if you supplied at least one field belonging to it. Naming `status` and
  filling in nothing would reset the video's privacy to default; that is refused locally.
- `part=snippet` on `videos.update` additionally requires **both** `title` and `categoryId`, which
  Google marks required on that method. Omitting `categoryId` is the classic way to get an opaque
  400, so it fails with a clear message instead. `playlists.update` likewise requires `title` on
  every call — omitting it does not preserve the existing title, it fails the request.

The safe workflow is: read with the same parts → change what you want → send the whole part back.

## Actions

| Key                    | Type    | Endpoint                        | Quota |
| ---------------------- | ------- | ------------------------------- | ----: |
| `search`               | search  | `GET /search`                   |     1 |
| `get-videos`           | read    | `GET /videos`                   |     1 |
| `update-video`         | perform | `PUT /videos`                   |    50 |
| `delete-video`         | perform | `DELETE /videos`                |    50 |
| `rate-video`           | perform | `POST /videos/rate`             |    50 |
| `get-channels`         | read    | `GET /channels`                 |     1 |
| `list-playlists`       | read    | `GET /playlists`                |     1 |
| `create-playlist`      | perform | `POST /playlists`               |    50 |
| `update-playlist`      | perform | `PUT /playlists`                |    50 |
| `delete-playlist`      | perform | `DELETE /playlists`             |    50 |
| `list-playlist-items`  | read    | `GET /playlistItems`            |     1 |
| `add-playlist-item`    | perform | `POST /playlistItems`           |    50 |
| `remove-playlist-item` | perform | `DELETE /playlistItems`         |    50 |
| `list-comment-threads` | read    | `GET /commentThreads`           |     1 |
| `reply-to-comment`     | perform | `POST /comments`                |    50 |
| `list-subscriptions`   | read    | `GET /subscriptions`            |     1 |

### Things the API's shape forces on you

- **Exactly one filter.** The list endpoints reject a request with no filter *and* one with several.
  `get-videos` takes one of `id` / `chart` / `myRating`; `get-channels` one of `id` / `mine` /
  `forHandle` / `forUsername` / `managedByMe`; `list-playlists` one of `id` / `channelId` / `mine`;
  `list-playlist-items` one of `playlistId` / `id`; `list-comment-threads` one of `id` / `videoId` /
  `channelId` / `allThreadsRelatedToChannelId`; `list-subscriptions` one of `id` / `mine` /
  `channelId` / `mySubscribers`. Each action enforces this before spending a request.
- **A search result is a pointer, not a resource.** `search` returns titles and thumbnails but never
  statistics, duration or status. Take the ids and call `get-videos` — 50 ids for 1 unit.
- **The uploads playlist is the cheap way to walk a channel.** It is not returned by
  `list-playlists`; its id is at `contentDetails.relatedPlaylists.uploads` from `get-channels` with
  `part=contentDetails`. Feeding that to `list-playlist-items` costs 1 unit per 50 videos and does
  not touch the tight `search` bucket at all.
- **A playlist item id is not a video id.** `remove-playlist-item` takes the *membership* id
  (`items[].id`), while the video is at `items[].snippet.resourceId.videoId`. Passing the video id
  404s. `list-playlist-items` has a `videoId` filter precisely so you can look the membership up.
- **Adding a video wraps it in a nested object.** `playlistItems.insert` identifies the video by
  `snippet.resourceId = { kind: "youtube#video", videoId }`, not a bare `videoId` field — a bare one
  is silently ignored. `add-playlist-item` builds the object for you.
- **`comments.insert` only creates replies.** `snippet.parentId` is required. New top-level comments
  are `commentThreads.insert`, a different endpoint this app does not implement, so the action is
  named `reply-to-comment` for what it actually does.
- **`channelId` vs `allThreadsRelatedToChannelId`.** The first returns comments about the channel
  itself; the second returns comments about the channel **and all of its videos**, which is almost
  always what you want.

## Quota — units, not requests

This is the constraint that governs everything on this API, and the number most third-party material
still gets wrong.

Google's live cost page states: *"The `search.list` and `videos.insert` methods have their own quota
buckets. Each of these methods has a default daily limit of 100 per day. The quota cost is 1 per
call."*

So the widely repeated **"`search.list` costs 100 units" figure describes the superseded model.**
Under the current one:

| Bucket                                   | Allowance          | Cost per call |
| ---------------------------------------- | ------------------ | ------------- |
| Shared, all methods except the two below | 10,000 units / day | see table     |
| `search.list`                            | 100 calls / day    | 1 unit        |
| `videos.insert`                          | 100 calls / day    | 1 unit        |

Getting this wrong misbudgets search in *both* directions: a search no longer eats the main
allowance at all, but 100 calls a day is a far tighter ceiling than a 10,000-unit budget implies —
and **each additional page of results is another call against it**.

Published per-method costs (`lib/quota.ts` carries the full table, asserted by unit tests):

| Class                                     | Cost |
| ----------------------------------------- | ---: |
| Any `list` read, `videos.getRating`       |    1 |
| Any write — insert, update, delete, rate  |   50 |
| `captions.insert`                         |  400 |
| `captions.update`                         |  450 |

Also true and easy to miss:

- **Every request costs at least 1 unit — including ones that fail validation.** A retry loop
  against a malformed request still burns quota.
- Each extra page of a paginated result costs the method's price again.
- Buckets reset at midnight Pacific Time.
- A default project's 10,000 units is 200 writes a day, or one write every seven minutes. Playlist
  automation hits this ceiling long before it hits a rate limit.

## Auth

Two methods, and they are not interchangeable.

### `oauth2` — the user's own account

The only way to reach a user's own data. Register an app in the Google Cloud Console, enable the
YouTube Data API v3, store `client_id` + `client_secret` + `redirect_uri` on the w6w server; users
then connect through the browser. `access_type=offline` + `prompt=consent` are set because Google
needs both to reliably return a refresh token.

**One scope is requested: `https://www.googleapis.com/auth/youtube.force-ssl`.** Google documents
seven YouTube scopes. Five are out of scope for this app — `youtube.upload` (not implemented, see
below), the two `youtubepartner*` scopes (Content ID partners only), and
`youtube.channel-memberships.creator` (the members endpoints, not implemented). Of the remaining
three, `force-ssl` is the only one that covers the whole action set: checked against the discovery
document's per-method `scopes` arrays, every method this app calls accepts it, whereas
**`commentThreads.list` and `comments.insert` accept `force-ssl` and nothing else** — so `youtube`
alone cannot serve the comment actions. Adding `youtube` or `youtube.readonly` beside it would grant
nothing extra and only lengthen the consent screen.

`afterConnect` labels the connection with the channel title (`channels.list?part=snippet&mine=true`,
1 unit), because a Google account and the channel it manages are different things and users commonly
hold several.

### `api-key` — public data, read-only

An API key identifies the *project*, not a user, so it reads anything already public and does
nothing else. That is a genuinely useful second posture — no consent screen, no refresh plumbing —
and it fits `AuthDefinition` cleanly rather than being bent to fit: Google takes the key as a `key`
query parameter, `ApiKeyConfig` models exactly that with `{ in: "query", name: "key" }`, and
`SignableRequest.url` is mutable so `sign` mirrors the same wiring.

**What it cannot do**, stated plainly so nobody debugs a 401 for an hour: any `mine=true` /
`forMine=true` filter; every write (`update-video`, `delete-video`, `rate-video`,
`create-playlist`, `update-playlist`, `delete-playlist`, `add-playlist-item`,
`remove-playlist-item`, `reply-to-comment`); `list-subscriptions`, which has no unauthenticated
form; and private or unlisted resources of any kind. Those return 401 or 403 — use `oauth2`.

## Not implemented: video upload

`videos.insert` is deliberately absent, and the reason is architectural rather than an oversight.

Per the discovery document, the method is `supportsMediaUpload: true` with `resumable` and `simple`
protocols against `/upload/youtube/v3/videos`, accepting `video/*` up to **274,877,906,944 bytes
(256 GB)**. A w6w action runs in a network-less Deno sandbox whose only I/O is `ctx.fetch`, with
read access scoped to the app directory and nothing else. It has no path to a user's video file, no
streaming body, and would have to hold the entire payload in memory as a single `ctx.fetch` body.
Resumable upload additionally requires stateful session-URL handling across several requests with
byte-range bookkeeping, which a hook that may run in a fresh worker each call cannot carry.

Shipping it would mean shipping something that cannot work, so it is left out and said so here.
`thumbnails.set`, `watermarks.set` and `captions.insert` are absent for the same reason. Note also
that `videos.insert` has its own 100-calls-per-day bucket regardless.

## Health check

Three questions, and only one of them has an honest probe on this API.

### Is the vendor up?

**Declared absent — checked, not assumed.** The sibling google-* apps in this pack read Google's
Workspace Status Dashboard incident feed and filter it to their own `service_name`. That does not
work here: the dashboard's own machine-readable product list
(`www.google.com/appsstatus/dashboard/products.json`, fetched 2026-08-03) enumerates 36 products —
Gmail, Calendar, Drive, Docs, Sheets, Tasks, Chat, Voice, … — and **YouTube is not among them.** It
is a consumer product, not a Workspace one. A filter on "YouTube" would match nothing, ever, and
report a permanent, meaningless `ok`; an outage the dashboard never covers would read as health.

The substitutes are worse: widening to all of Workspace makes a Meet incident fail this app;
`status.cloud.google.com` covers Google Cloud Platform products, not this API; `@TeamYouTube`
publishes prose, not Atom or RSS, so there is nothing to hand to `feed`; and pinging
`youtube.googleapis.com` unauthenticated proves only that TLS reaches Google's front end, which
stays up through a backend incident — it would report `ok` during the outage it exists to catch.

### Is this credential live?

Derived automatically from each auth method's `test` hook, so it comes free.

`oauth2` probes `channels.list?part=id&mine=true` — the canonical YouTube whoami, 1 unit, the
cheapest call the API offers, and reachable by `youtube.readonly`, `youtube` and `force-ssl` alike,
so a narrowly-scoped credential is never reported as broken. An account with no channel returns 200
with empty `items`; that is a live credential and is reported as one.

`api-key` cannot use that probe — it would 401 — so it uses `i18nLanguages.list?part=snippet`
instead: fully public, 1 unit, no scope and no channel needed, and non-empty for every valid key, so
an empty response is a real signal rather than an empty account.

### Do we have quota left?

**Declared absent, but unusually informative.** YouTube documents its cost *model* better than
almost any API in this pack — every method's price, the daily allowance and the reset time are all
published — yet none of it is readable at runtime. There is no headroom endpoint and no
`X-RateLimit-*`-style headers; consumption is visible only in the Google Cloud console
(IAM & Admin → Quotas), a different API with different credentials that this app's YouTube scope
cannot reach. Exhaustion is discovered as `403 quotaExceeded`.

A probe that inferred headroom by making a call would spend quota to measure quota and could still
only distinguish "some left" from "none left", never a number. So the check states the real cost
model in its `reason` instead of pretending to measure it.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key             | Kind       | Scope      | Credential | Severity      | Probe                                                 |
| --------------- | ---------- | ---------- | ---------- | ------------- | ----------------------------------------------------- |
| `service`       | service    | app        | none       | informational | _declared absent_                                     |
| `quota`         | quota      | connection | signed     | informational | _declared absent_                                     |
| `auth:oauth2`   | credential | connection | signed     | fatal         | derived from the `oauth2` auth method's `test` hook   |
| `auth:api-key`  | credential | connection | signed     | fatal         | derived from the `api-key` auth method's `test` hook  |

Both declared absences carry `severity: "informational"`. That is mandatory, not stylistic: an
`unavailable` entry always reports `unknown`, and without informational severity that `unknown`
would pin this app's roll-up verdict there permanently.

No status host is added to any allowlist, because neither check makes a request. The app's egress
stays exactly one host: `youtube.googleapis.com`.

## Links

| What                                          | URL                                                            |
| --------------------------------------------- | -------------------------------------------------------------- |
| Product                                       | https://www.youtube.com                                        |
| API reference (used to build this app)        | https://developers.google.com/youtube/v3/docs                  |
| Getting started                               | https://developers.google.com/youtube/v3/getting-started       |
| Quota costs (the unit model above)            | https://developers.google.com/youtube/v3/determine_quota_cost  |
| Authentication & OAuth                        | https://developers.google.com/youtube/v3/guides/authentication |
| Discovery document                            | https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest   |
| Google Cloud Console (keys, quota, OAuth)     | https://console.cloud.google.com                               |
| YouTube API samples (GitHub org)              | https://github.com/youtube                                     |
| `youtube/api-samples` (GitHub)                | https://github.com/youtube/api-samples                         |
| Generated API clients (GitHub)                | https://github.com/googleapis/google-api-nodejs-client         |
| YouTube Help                                  | https://support.google.com/youtube                             |

Icon: the vendor's own mark, copied verbatim from n8n's `nodes-base`
(`nodes/Google/YouTube/youTube.png`), matching the provenance of the other ported apps in this pack.
Verified byte-identical to upstream; it is a PNG rather than an SVG because that is the format n8n
ships, as with the nine other PNG icons here.

---

Researched and endpoint-verified 2026-08-03 against the live **discovery document**
(`https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest`, revision `20260729`) — the
machine-readable source for every host, path, method, `part` value, required parameter and per-method
OAuth scope asserted above — cross-checked against the HTML reference for the documented `part` value
sets and the required-property lists on `videos.update` and `playlists.update`, and against the live
quota page for every unit cost. Quota rules and status surfaces move; re-check them if budgeting or a
probe starts behaving differently for everyone at once.
