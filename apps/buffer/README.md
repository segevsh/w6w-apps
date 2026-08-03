# Buffer

Schedule and manage social posts, channels, ideas and post metrics in [Buffer](https://buffer.com/),
on the **Buffer GraphQL Public API** (`api.buffer.com`).

- **Categories** — social-media, marketing
- **Auth methods** — `api-key`, `oauth2`
- **Actions** — 14
- **Egress allowlist** — `api.buffer.com` (plus `auth.buffer.com`, added by the loader from the
  OAuth endpoints, and `status.buffer.com` on the service health check alone)
- **Health checks** — `service` (live), `quota` (live), plus 2 derived `auth:*`
- **Unit tests** — 222

## Links

| What | Where |
| ---- | ----- |
| **Website** | <https://buffer.com/> |
| **API docs** | <https://developers.buffer.com/> |
| **Source / git repo** | <https://github.com/bufferapp/buffer-mono> — see the note below |
| API reference (full schema) | <https://developers.buffer.com/reference.html> |
| Mint an API key / register an OAuth client | <https://publish.buffer.com/settings/api> |
| Status page | <https://status.buffer.com/> |
| Legacy REST API (retiring 2027-02-01) | <https://buffer.com/developers/legacy-api> |

> **On the docs link.** The candidate entry cited `https://buffer.com/developers/api`. That URL is
> **stale**: it answers `301 Moved Permanently` to `https://developers.buffer.com/` (verified on the
> wire, 2026-08-03). It is a redirect rather than a 404, so it "works" — but it lands on the *new*
> API's documentation, not the one the old URL described, which is the kind of near-miss worth
> naming.
>
> **On the source repo.** Buffer publishes no open-source client for this API, and the API itself is
> closed-source. `github.com/bufferapp/buffer-mono` is named because it is where Buffer's own
> published CLI lives — `@bufferapp/cli` on npm declares
> `"repository": {"url": "git+https://github.com/bufferapp/buffer-mono", "directory": "services/cli"}`
> — but **the repository is private**; the link is the vendor's declared home for the code, not a
> browsable source. What *is* public is the npm tarball, and it matters here: see
> [Where the enum values came from](#where-the-enum-values-came-from).

---

## Feasibility: why this app exists now and could not have existed two years ago

This app was commissioned with an explicit warning that it might not be buildable, and that
"this cannot be built honestly" was a welcome answer. It turned out to be buildable, but only
because of a change Buffer shipped in May 2026 — and the reason the warning was reasonable is
worth recording, because most of what is written about "the Buffer API" still describes the
closed one.

| Surface | Base | State |
| ------- | ---- | ----- |
| Legacy REST API (2012) | `api.bufferapp.com/1/` | **Retiring 2027-02-01.** Closed to new developer apps for years |
| **GraphQL Public API** | `https://api.buffer.com` | **GA since May 2026** — what this app is built on |

Buffer's own retirement notice is unambiguous on both halves: the legacy REST API is *"being fully
retired"*, *"Requests to legacy endpoints will no longer return data"* after **2027-02-01**, with
brownouts on **2026-11-11** and **2026-12-09**; and the replacement is *"a strongly typed,
GraphQL-first API with an MCP server, a CLI, and managed OAuth, running on the same infrastructure
as our own apps"* (<https://buffer.com/resources/legacy-rest-api-retired/>).

Three things were checked on the wire before a line was written, because "documentation exists" and
"a credential can be obtained" are different claims:

1. **Can a credential still be minted?** Yes, self-serve, on every plan. Buffer's authentication
   guide: *"Log in to your Buffer account · Go to Settings → API · Create a new API key · Copy the
   key"*, and the rate-limit table budgets **API Keys: 1** on Free, 3 on Essentials, 5 on Team.
   No application, no review, no partner agreement.
2. **Is OAuth actually open?** Yes. *"Visit Settings → API to register your app"*, with **App
   Clients: 1** on Free. And both endpoints answer correctly for a bogus client — see
   [Authentication](#authentication) for the transcript.
3. **Do the documented endpoints respond?** Yes. `POST https://api.buffer.com` with no credential
   returns `401 {"errors":[{"message":"An authentication JWT or Access Token is required",
   "extensions":{"code":"UNAUTHENTICATED"}}]}` — a live, correctly-shaped GraphQL rejection, not a
   parked host.

All three verified 2026-08-03. The verdict is that the "Buffer's API is effectively closed" position
was correct until mid-2026 and is now out of date.

---

## The one thing most likely to go wrong: a 200 that means failure

Buffer fails in **three** structurally different ways and only one of them shows up in the status
line. This is the dominant bug class this app is built to defend against, and all three are
implemented in [`lib/client.ts`](lib/client.ts).

### 1. A real non-2xx

Verified on the wire, 2026-08-03:

| Request | HTTP | Body |
| ------- | ---- | ---- |
| `POST /` no `Authorization` | **401** | `{"errors":[{"message":"An authentication JWT or Access Token is required","extensions":{"code":"UNAUTHENTICATED"}}]}` |
| `POST /` `Authorization: Bearer bogus_key_123` | **401** | `{"errors":[{"message":"Access token is not valid","extensions":{"code":"UNAUTHENTICATED"}}]}` |
| `POST /` bad token **and** a nonexistent field | **401** | identical — auth is checked **before** query validation |
| `GET /` | **401** | same JSON envelope |
| rate limit exhausted *(documented, not reproduced)* | **429** | `{"errors":[{…,"extensions":{"code":"RATE_LIMIT_EXCEEDED","window":"15m"}}]}` |

### 2. HTTP 200 with a populated `errors` array

Buffer states it plainly: *"GraphQL always returns HTTP 200. Check the response body to determine
success or failure."* Documented codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `UNEXPECTED`,
`RATE_LIMIT_EXCEEDED`. Query-limit violations (complexity, depth, aliases, directives, tokens)
arrive here too, with **no `extensions.code` at all**.

### 3. HTTP 200, no `errors` array, and the failure inside `data`

The nasty one, and it is unique to the mutations. Every Buffer mutation returns a *union* whose
error arms are ordinary members:

```json
{ "data": { "createPost": { "message": "Text is required" } } }
```

`res.ok` is true. `body.errors` is absent. A client that stopped checking there hands a workflow an
error object shaped like a post. Buffer's own words: *"Typed mutation errors … In the response data …
User-fixable problems (validation, limits) … HTTP Status 200"*.

**What this app does about it.** Every mutation selects `__typename` plus a
`... on MutationError { message }` catch-all and routes its payload through `BufferClient.mutate()`,
which throws on any arm that is not a declared success type. That is Buffer's own instruction, not
belt-and-braces: *"Always include `... on MutationError` in every mutation … Because all error types
implement the `MutationError` interface, any error type you don't explicitly handle will still
return a message."* Buffer even ships a `VoidMutationError` member it never returns, so unions stay
future-proof against new arms.

`RestProxyError` is broken out separately, because it means the **social network** refused rather
than Buffer — it carries a `link` to Buffer's help article and a `code`, and "Instagram rejected this
image" needs a different fix from "Buffer rejected this input".

`tests/index.test.ts` greps every action's source: a mutation that used `.request()` instead of
`.mutate()`, or dropped `__typename`, fails the suite.

### A documented code that is not the served code

Buffer's error table lists **`UNAUTHORIZED`** for "missing or invalid API key". The live API returns
**`UNAUTHENTICATED`** for exactly that case, twice over. Both spellings are treated as credential
failures (`CREDENTIAL_ERROR_CODES` in `lib/client.ts`) rather than picking a winner — one is what the
vendor published, the other is what the vendor serves.

---

## Where the enum values came from

Buffer's published reference lists every enum *type* — `PostStatus`, `ShareMode`, `SchedulingType`,
`Service` — with a description, and renders **none of their members**. The type cards are literally
empty for enums; the docs bundle (`scripts/main.db20617a.js`) fetches only `search-index.json`; and
there is no `schema.json` / `schema.graphql` / introspection document anywhere on the docs host
(all four 404, checked 2026-08-03). Live introspection is not available either: `api.buffer.com`
rejects at the auth layer before validation, so an unauthenticated `{ __schema { … } }` returns the
same `UNAUTHENTICATED` 401 as everything else.

Guessing was therefore the only alternative to finding a primary source — and a guessed enum member
is exactly how an app ships a dropdown that always 400s.

**The source used instead is Buffer's own published CLI.** `@bufferapp/cli@1.2.0` on npm bundles
generated-from-schema command metadata under `built/*.mjs`, each file opening
`// src/generated/command-details/<operation>.ts`. Every flag carries its `graphqlTypeName` and, for
enums, an explicit `enumValues` array; nested inputs carry a `jsonInputSchema` with JSON-Schema
`enum` lists.

Every vocabulary in [`lib/params.ts`](lib/params.ts) is transcribed from that generator output, and
each one *agrees with* the values Buffer's hand-written examples happen to use (`mode: addToQueue`,
`mode: customScheduled`, `schedulingType: automatic`, `status: [scheduled]`, `status: [sent]`,
`field: dueAt`, `direction: asc`). The generator supplies the members no example demonstrates.

```
ShareMode        addToQueue · shareNow · shareNext · customScheduled
SchedulingType   automatic · notification
PostStatus       draft · needs_approval · scheduled · sending · sent · error
PostSortableKey  dueAt · createdAt
SortDirection    asc · desc
DateTimePresence present · absent
Product          analyze · engage · publish · buffer · startPage · comments
Service          instagram · facebook · twitter · linkedin · pinterest · tiktok ·
                 googlebusiness · startPage · mastodon · youtube · threads · bluesky
MediaType        image · gif · video · link · document · unsupported
IdeaGroupMembership  ungrouped · grouped
```

Note `needs_approval` — the one member in this entire app that is not camelCase. A `needsApproval`
guess would 400, and a test pins the spelling.

Two of these are recorded but deliberately **not** offered as a dropdown:

- **`Service`** — no action takes a network as input. Channels are addressed by id and the id fixes
  the network. `ChannelsFiltersInput` has exactly two fields (`isLocked`, `product`) and **no service
  filter**, so a "network" dropdown on `channel-list` would look like it narrowed the result and
  quietly do nothing.
- **`MediaType`** — Buffer's own field description says *"'video' is not supported via public API"*.
  Four of six members work, one is documented-broken, one is a sentinel. `idea-create` takes media as
  pass-through JSON with the caveat on the field rather than presenting a clean six-way choice.

---

## Authentication

Two methods, answering different questions. Neither substitutes for the other.

### `api-key` — a personal key, one Buffer account

Minted at **Settings → API** (<https://publish.buffer.com/settings/api>) and sent as
`Authorization: Bearer <key>`. Available on every plan including Free.

The load-bearing fact about its scope, in Buffer's words:

> Your API key acts on behalf of your account only · It can access all organizations and channels in
> your account · **There is no per-organization scoping at this time** · The key is account-based,
> not organization-based.

So one Connection is one Buffer *account*, and it may span several organizations. That is why nothing
narrows to an organization at connect time and why almost every action takes an `organizationId`
parameter instead — scoping is a per-call decision, because the credential cannot express it.

### `oauth2` — Authorization Code + PKCE, for other people's accounts

Endpoints are on `auth.buffer.com`, a different host from the API. Probed 2026-08-03:

| Request | Result |
| ------- | ------ |
| `GET /auth` with no params | `302` → `/error?…&error_description=missing%20required%20parameter%20'client_id'` |
| `GET /auth?client_id=zzz&…&code_challenge_method=S256` | `302` → `/error?…&error_description=client%20is%20invalid` |
| `POST /token` with a bogus client | `{"error":"invalid_client","error_description":"client authentication failed"}` |

Both endpoints are live and behave exactly as documented — parameters validated in order, RFC 6749
error envelope on the token endpoint. A closed or vestigial OAuth deployment does not answer like
that.

`pkce` is left at the type default of `true`, and that is correct rather than accidental: Buffer
describes the flow with PKCE as *"required for all Buffer OAuth clients"* and documents
`code_challenge_method=S256`. (Contrast the sibling `linkedin` app, which must set `pkce: false`
explicitly.)

All seven published scopes are requested. `offline_access` is not optional in practice — access
tokens are `expires_in: 3600` and the refresh token is *"Only returned if the `offline_access` scope
is requested"*, so without it a Connection would break an hour after it was made. `account:write` is
included although nothing here writes account settings, because Buffer's consent screen shows what
the *client* registered for; narrowing the list in this package would not narrow what a user is
asked to grant. That is noted rather than hidden.

No custom `refresh` hook is declared, deliberately. Buffer warns in bold:

> ⚠️ Refresh tokens are single-use. Every successful refresh returns a new `refresh_token` and
> invalidates the one you sent … **Reusing an old refresh token revokes all tokens for that grant**
> — your user will need to re-authorize.

The runtime's built-in handler already does the rotate-and-replace exchange Buffer requires. A
bespoke hook would be a second implementation of the one thing that must not be got wrong.

`client_id` / `client_secret` / `redirect_uri` live on the w6w server
(`PUT /apps/:id/oauth-config/oauth2`), never in this package.

### The probe: chosen by reading the response body, not by the name

Both `test` hooks send **`{ account { id } }`** — one scalar, one level deep, about as cheap as a
Buffer query gets (the complexity meter charges 1 per scalar, 2 per object, ×1.5 per level).

**Nothing in Buffer's schema echoes a token, key or password back to the caller.** That was checked
across all 216 documented types, and it is worth stating positively because it is not the norm — the
sibling `followupboss` app has to ban `GET /me`, which returns the caller's own `apiKey`, and
Mailjet's `/v3/REST/apikey` returns a key *and* its secret.

What Buffer's `Account` type *does* expose is `email`, `backupEmail` and `connectedApps` — the
account holder's addresses, and an enumeration of every other OAuth integration they have authorised
with `clientId`, `name` and `website` for each. None of it is secret; none of it belongs in a
liveness probe either. So:

- The probe selects `id` and nothing else.
- `afterConnect` adds `name` and the organizations' `id`/`name` — enough to label a Connection and
  hand over the ids every action needs — and still no email.
- A test greps `auth/`, `health/` and `lib/identity.ts` and fails if `email`, `backupEmail` or
  `connectedApps` appears in any of them, with a second test proving the grep would catch a real
  violation.
- `account-get` is the one action that can return an email, behind an explicit off-by-default
  toggle. It never selects `connectedApps` at any setting, and a test pins that too.

`test` distinguishes three outcomes because they need three different fixes: a credential error
(`UNAUTHENTICATED` / `UNAUTHORIZED`) says check or rotate the key; `FORBIDDEN` says the credential is
real but not permitted, which on an OAuth Connection is usually a missing scope and a re-consent; and
anything else is Buffer's problem, reported as such rather than as "auth failed".

---

## Actions

Buffer's schema has exactly nineteen root fields — ten queries and nine mutations — and **six carry
Buffer's own ⚠️ Experimental badge**. This app implements all thirteen stable ones and none of the
experimental ones.

### Account & organizations (2)

| Action | Operation | Notes |
| ------ | --------- | ----- |
| `organization-list` | `account { organizations }` | **Run this first.** There is no root `organizations` query and no default organization |
| `account-get` | `account` | Timezone, preferences, organizations. Email is opt-in; `connectedApps` never |

### Channels (3)

| Action | Operation | Notes |
| ------ | --------- | ----- |
| `channel-list` | `channels` | Returns `isDisconnected`, `isLocked` and `isQueuePaused` to branch on. Plain list — not a connection, so no pagination |
| `channel-get` | `channel` | Adds `postingSchedule`, the slots a queued post actually lands in |
| `daily-posting-limit-list` | `dailyPostingLimits` | Per-channel headroom for a day. Run before bulk scheduling |

### Posts (6)

| Action | Operation | Notes |
| ------ | --------- | ----- |
| `post-list` | `posts` | Cursor paginated. Five distinct temporal filters — see below |
| `post-get` | `post` | Metrics opt-in |
| `post-create` | `createPost` | One post, one channel |
| `post-edit` | `editPost` | Omission is meaningful — see below |
| `post-delete` | `deletePost` | Echoes the deleted id |
| `post-metrics-aggregate` | `aggregatedPostMetrics` | Totals over a window, capped at 365 days |

### Ideas (3)

| Action | Operation | Notes |
| ------ | --------- | ----- |
| `idea-list` | `ideas` | Cursor paginated. `groupFilter` is `@oneOf` |
| `idea-group-list` | `ideaGroups` | Read-only — the schema has no group mutation at all |
| `idea-create` | `createIdea` | Success arm is two types wide |

### Five things in here that are easy to get wrong

**`first` / `after` are field arguments, not part of `input`.** Easy to miss from the guide prose.
The operation shape is `query Posts($input: PostsInput!, $first: Int, $after: String)` —
confirmed against Buffer's generated CLI document and its `get-paginated-posts` example.
`posts` and `ideas` are the only two Relay connections in the schema.

**`dueAt` without `mode: customScheduled` does not schedule the post.** With `addToQueue` Buffer
picks the slot and the time is ignored. The hints on both fields name the other, because this is the
failure that looks like it worked. A second silent one: `addToQueue` against a channel whose queue is
paused succeeds and then never publishes — `channel-list` returns `isQueuePaused`.

**`post-list` has five temporal filters and they are not synonyms.** `startDate`/`endDate` match
*"createdAt **or** dueAt"* (Buffer's own wording); `dueAt: {start,end}` and `createdAt: {start,end}`
are comparators on one timestamp each; `dueAtPresence` asks whether a post is scheduled at all, and
Buffer rejects `absent` alongside a `dueAt` range. All five are exposed rather than collapsed into
"a date range", because collapsing would pick a meaning for the user.

**On `editPost`, omitting a field is an instruction.** Buffer documents three different omit
semantics: `assets` — *"Omit to preserve the existing list, pass an empty array to clear it"*;
`mode` — *"Omit the field or pass null to make no scheduling change"*; `approvalChange` — only valid
where a channel's posting policy requires approval. `compact()` drops blanks so an untouched field is
genuinely absent, and the raw **Assets** param is the only way to send `[]`.

**`channelIds: []` and an omitted `channelIds` are opposites on `aggregatedPostMetrics`.** *"When
omitted (null), the aggregate spans every channel … When set to an empty array, no channels match
and the result is empty."* `idList()` returns `undefined` for a blank field precisely so a user who
typed whitespace gets "every channel", not "none".

### Per-network configuration is pass-through, on purpose

`PostInputMetaData` is keyed by network — `instagram`, `facebook`, `linkedin`, `twitter`,
`pinterest`, `google`, `youtube`, `mastodon`, `threads`, `bluesky`, `tiktok` — and each arm has its
own shape: a LinkedIn `firstComment`, an X `thread` array, an Instagram `type: reel` with sticker
fields and geolocation, a Google Business `detailsOffer` with dates and a call-to-action button.
Roughly a hundred and fifty fields across the eleven.

Flattening that would produce an action with a hundred inputs of which ninety are inert for any given
channel, and it would go stale the first time Buffer adds a network. So `metadata` is a JSON param
passed through unchanged, with the reference cited on it. The trade is stated rather than hidden:
this is the one place a user has to read Buffer's docs to use a field.

One rejection worth knowing, quoted from `CreatePostInput` itself:
*"`metadata.{service}.linkAttachment` is mutually exclusive with a non-empty `assets` array. Input
providing both is rejected."*

### Assets are URLs Buffer pulls, not uploads

There is no multipart endpoint in this schema. `AssetInput` is a four-way choice — image, video,
link, document — each taking a public `url` Buffer fetches. That is why this app needs only one
allowlisted host: **nothing here uploads anything anywhere.**

## What is deliberately not built

| Thing | Why |
| ----- | --- |
| **Post templates** (`postTemplate`, `postTemplates`, `createPostTemplate`, `updatePostTemplate`, `deletePostTemplate`) | All five carry Buffer's ⚠️ Experimental badge — *"likely to have breaking changes"* — and the `visibility` enum's `public` member is *"reserved for Buffer-curated templates; setting it is only available to official Buffer clients"* |
| **`movePostInQueue`** | Experimental, same badge. The most useful of the omissions (reorder a queued post to top or bottom) and the first thing to add when Buffer promotes it |
| **`EditPostInput.approvalChange`** | A `PostApprovalChange` enum whose members Buffer's reference does not render, and — unlike every other enum here — does not appear in the published CLI's generated metadata either. A `select` would be guessed members; a free-text field would be a trap dressed as a feature |
| **`Post.metadata` as an output** | A twelve-network union whose expansion runs to hundreds of fields. Every consumer wants one network's arm and there is no generic way to ask for that. It remains *writable* via the `metadata` param |
| **Idea group mutations** | Not an omission: the schema has no `createIdeaGroup`, no rename, no delete. Groups are made in Buffer's UI |
| **Webhooks / triggers** | No subscription root in the schema and no published webhook surface. There is nothing to poll a trigger against that `post-list` does not already do |
| **Media upload** | Not an omission: Buffer has no upload endpoint. Assets are URLs Buffer fetches |
| **The legacy REST API** | Retiring 2027-02-01, closed to new developer apps, and a different credential entirely. Supporting it would mean two auth systems for one product, one of which nobody can get into |

A test pins the six experimental root fields so that adding one is a conscious act with a README
change beside it, rather than something that drifts in.

---

## Health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
| --- | ---- | ----- | ---------- | -------- | ------------ | ----- |
| `service` | service | app | none | *(default `degraded`)* | 60s | `GET status.buffer.com/api/v2/summary.json` |
| `quota` | quota | connection | signed | `informational` | 60s | `POST api.buffer.com` `{ account { id } }` |
| `auth:api-key` | credential | connection | signed | derived | — | derived from `Auth.test` |
| `auth:oauth2` | credential | connection | signed | derived | — | derived from `Auth.test` |

### `service` — Buffer platform status · live · **default `degraded` severity**

#### The status page passes all three identity checks

**(a) A bogus sibling path on the same host.** A catch-all returns one body for everything; a real
Statuspage routes.

| Path | Result |
| ---- | ------ |
| `/api/v2/summary.json` | **200**, `application/json`, 4,066 B |
| `/api/v2/bogus-not-real.json` | **404, 0 bytes, no content-type** |
| `/` | 200, `text/html`, 106,384 B |

**(b) Content-type and body.** `application/json`, parsing as the Statuspage v2 schema — `page`,
`status`, `components`, `incidents`, `scheduled_maintenances` — not HTML wearing a `.json` suffix.
It is neither known unclaimed-subdomain signature (Statuspage's 127,720 B / md5 `8d3c480a2267`,
Instatus's 216,836 B / md5 `b9120253d885`) and it does not 401 with "Your page is inactive".

**(c) Does the page describe THIS product?** The decisive check, and the one that caught
`circle.statuspage.io` belonging to a Discord bot.

```json
"page": { "id": "01JAQVAANK9BQ3TJ084A1V89HH",
          "name": "Buffer",
          "url": "https://status.buffer.com/",
          "updated_at": "2026-07-09T10:54:59Z" }
```

`page.url` points at **Buffer's own domain**, not a `*.statuspage.io` subdomain someone else
claimed, and the nineteen component names are unmistakably this product: *Buffer API*, *Buffer MCP*,
*Publishing*, *Analytics*, *Channel connections*, *Login*, *Settings*, *Community*, and one per
network — *Facebook*, *X*, *Bluesky*, *Youtube*, *TikTok*, *Mastodon*, *Pinterest*, *Google Business
profile*, *Threads*, *Instagram*, *LinkedIn*. A fourth, independent confirmation: the page is linked
from Buffer's own developer documentation header.

#### Why the verdict is NOT Buffer's own indicator

`summary.json` carries a global `status.indicator` and taking it would be the one-liner. It is wrong
here: the rollup aggregates *Login*, *Settings*, *Analytics*, *Community* and *Buffer MCP*, any of
which can go orange while `api.buffer.com` answers perfectly. Using it would degrade every tenant's
app because Buffer's community forum was down.

The state is computed from the **`Buffer API`** component alone — literally the surface every action,
both `test` hooks and the `quota` check call. Everything else is still reported under `components`
for attribution, and Buffer's indicator is folded into `message`, so nothing is hidden; it just does
not drive the verdict. If that component is ever renamed the check falls back to the global indicator
and **says so in the message** — a silent fallback's failure mode is "this check stops meaning
anything".

#### The judgement call: `Publishing` is attribution, not verdict

`Publishing` covers a scheduled post actually going out to a network later, and it is tempting to
fold into the verdict for a *scheduling* app. It is a different failure. If `Publishing` is degraded,
`post-create` still succeeds — the post is accepted and queued, exactly as the API contract says, and
nothing a workflow does synchronously fails. The same goes for the eleven per-network components; an
Instagram outage surfaces later as a `RestProxyError` arm on the post, which the actions already
report.

Folding them in would make the check answer *"will this eventually publish?"* rather than *"will my
call work?"*, and a host reading `degraded` would have no way to tell which it meant. They are
reported, and `Publishing` is called out by name in the message with "API calls are unaffected"
beside it, so an operator sees it without the verdict being driven by it. Two tests pin the boundary.

#### Why severity stays at the default `degraded`

The sibling `discourse` app downgrades to `informational` because most Discourse forums are
self-hosted and unaffected by the vendor's page. **That reasoning does not transfer.** Buffer is
fully vendor-hosted: no self-hosted Buffer exists, every account's API is served from the single
origin `api.buffer.com`, and no tenant supplies a host of its own. A `Buffer API` outage therefore
affects every Connection without exception, which is what `degraded` is for. The narrowing above is
what makes that weight defensible — the check only carries it for the one component this app depends
on.

### `quota` — API rate-limit headroom · live · `severity: "informational"`

**Three concurrent windows, not one.** This is the unusual part:

| Window | Free | Essentials | Team |
| ------ | ---- | ---------- | ---- |
| 15 min | 100 | 100 | 100 |
| 24 h | 250 | 250 | 500 |
| 30 days | 3,000 | 7,500 | 15,000 |

A burst exhausts the 15-minute window; a steady trickle exhausts the 30-day one, and 3,000 a month is
about four an hour. So all three are reported as separate `quota[]` rows and the verdict is the
**worst** of them — reporting only one would hide whichever is actually about to fail.

Buffer publishes structured-field headers on every response:

```
RateLimit: "200-in-15min";r=198;t=897
RateLimit: "1000-in-1day";r=998;t=86397
RateLimit: "30000-in-30days";r=29969;t=696980
RateLimit-Policy: "200-in-15min";q=200;w=900;pk=:ZjJjZjVmNzM5M2Zm:
```

`q` quota, `w` window seconds, `r` remaining, `t` seconds to reset. The parser splits repeated
members on comma-then-quote — the same regex Buffer's own JavaScript example uses, because a bare
comma split would shred the `pk=:base64:` parameter — and joins the two headers by their shared
quoted name.

**Policies are matched by window length, not by name**, following Buffer's explicit instruction:
*"Policy names like `200-in-15min` are generated from your quota and window, so they change with your
plan. Match a policy by its window length (`w`) — 900, 86400, or 2592000 — rather than by name."*
A fourth window appearing would be labelled by its raw `w` rather than dropped.

`resetAt` **is** populated here, unlike in the sibling `followupboss` app: `t` is an explicit
countdown to a reset event, where Follow Up Boss's sliding window has no reset instant to name.

A **429 is a reading, not an error** — handled before the generic failure branch, surfacing
`extensions.window` (`15m` / `24h` / `30d`) and the `Retry-After` header, because *"the retry hint is
in the header, not the body"*.

#### How far this was verified

**Stated plainly: the headers were NOT observed on the wire.** Verifying them needs a working Buffer
credential and this app was built without a Buffer account. What *was* checked, 2026-08-03, is the
negative case: `POST https://api.buffer.com` with `Authorization: Bearer bogus` returns 401 with
`date`, `content-type`, `content-length`, `cf-ray`, `etag`, `set-cookie`, `strict-transport-security`,
`vary` and the usual Cloudflare/security headers — and **no `RateLimit`, `RateLimit-Policy` or
`Retry-After` among them**. That is consistent with rejection at the auth layer before the limiter
runs, and therefore neither confirms nor refutes the documented behaviour on an authenticated call.

The parser is built for that uncertainty rather than around it: absent or unparseable headers yield
`state: "unknown"` with a message naming what was missing — never a fabricated reading, never a false
`ok`.

#### Probing costs a request against the thing being measured

Unavoidable, and Buffer's own advice is the mitigation: *"The headers come back on every GraphQL
response, so you can read them off requests you already make."* A host wanting zero-cost quota
reporting should read them off action responses; this check exists for when no action has run
recently. `minIntervalSeconds: 60` caps it at 15 of the 15-minute window's 100.

### Why there is no `dependency` check

`kind: "dependency"` exists for apps addressed by a per-tenant host — a Zendesk subdomain, a
self-hosted WordPress — where "is the site reachable" is a different failure from "is the credential
good". Buffer has no such surface: one origin serves every account, no Connection supplies a URL, and
there is nothing for a tenant to misconfigure. A dependency check here would restate the `service`
check with less information.

---

## Sandbox posture

- Network **only** via `ctx.fetch`, and only through `lib/client.ts` / `lib/identity.ts`. No action
  calls `fetch` directly; a test greps for it.
- No `Deno.*` anywhere in `actions/`, `auth/`, `lib/` or `health/`; a test greps for that too.
- The credential appears **only** in `auth/api-key.ts`'s `sign` hook (and, for OAuth, is stamped by
  the runtime). No action references `credential`, sets `Authorization`, builds a bearer scheme or
  assembles headers. No action declares a `secret` param.
- Error messages never include the request body, the variables or any header.
- `w6w.network.allow` is the single literal **`api.buffer.com`**. `auth.buffer.com` is added by the
  loader from the OAuth endpoint URLs. `status.buffer.com` is declared on the `service` health check
  alone and is deliberately absent from the app allowlist, because no action has business calling it.
  A test reads `package.json` and asserts the allowlist is exactly one host.

## Icon provenance

**The icon is the vendor's own mark, ported — not drawn.**

The single `<path>` is copied **verbatim** from Buffer's own favicon,
<https://buffer.com/icons/favicon.svg> (`viewBox="0 0 512 512"`), linked from the `<head>` of
buffer.com. The only change is the fill: Buffer's favicon carries `#231F20` with a dark-mode media
query, and this uses **`#132062`** — Buffer's brand navy, taken from
<https://buffer.com/icons/buffer-icon.svg>, the mask-icon Buffer serves from the same directory,
which draws the same three-layer mark in that colour. So both the geometry and the colour come from
Buffer's own published assets; nothing was drawn or approximated.

There is **no Buffer node in `n8n/packages/nodes-base/nodes/`** to port a mark from — checked, none
exists — so the vendor's own SVG is the source. This is not one of the pack's drawn-icon exceptions.

## Layout

```
buffer/
├── index.ts                    # manifest: 14 actions, 2 auth methods, 2 health checks
├── auth/api-key.ts             # personal key → Authorization: Bearer
├── auth/oauth2.ts              # Authorization Code + PKCE on auth.buffer.com
├── lib/client.ts               # GraphQL transport, the three failure arms, unwrapMutation
├── lib/identity.ts             # the shared `{ account { id } }` probe and connection label
├── lib/params.ts               # enum vocabularies, shared params, GraphQL fragments, assets
├── health/service.ts           # statuspage summary.json, state keyed on the Buffer API component
├── health/quota.ts             # RateLimit / RateLimit-Policy structured headers, three windows
├── actions/                    # one file per action
└── tests/                      # one test file per action, plus lib / auth / health / manifest
```

## Development

From this directory, against the `api` container:

```bash
deno task check   # typecheck
deno task lint    # deno lint
deno task fmt     # format — never bare `deno fmt`, it rewrites assets/icon.svg
deno task test    # 222 unit tests
```

Pack audit, from `packages/apps/`:

```bash
deno run --no-check -A _tools/audit.ts buffer
```

> The auditor reports one error — `entry/import — Import "@w6w/types" not a dependency`, raised at
> `health/quota.ts` where `worstHealthState` is imported as a runtime *value*. It is a **known false
> positive** affecting 28 apps in the pack (`circle` reports the identical error at the identical
> line of its own `health/service.ts`) and is filed as `.ai/projects/backlog/26-08-03-02`. Because
> the auditor aborts at that point, the remaining checks were verified against a scratch copy of this
> app with the value import inlined: **0 errors, 0 warnings**.

## Verification

Everything above was checked against live vendor material on **2026-08-03**, not from memory:

- `developers.buffer.com` — all eleven guide pages, all eleven examples, and the full 1.24 MB API
  reference, fetched and read rather than summarised.
- `api.buffer.com` — probed unauthenticated, with a bogus bearer token, with a bogus token plus an
  invalid field, and by `GET`, to establish the auth-before-validation ordering and the absence of
  rate-limit headers on the 401 path.
- `auth.buffer.com` — both endpoints probed with missing and invalid client parameters.
- `status.buffer.com` — summary, a bogus sibling path, and the root page, for the three identity
  checks.
- `@bufferapp/cli@1.2.0` — the npm tarball, for schema-generated enum values and operation shapes.

Where the evidence stops is stated where it stops: the rate-limit response headers were **not**
observed, because that needs a credential this app was built without.
