# Productboard

Read and write the Productboard product hierarchy, push and triage customer feedback notes, inspect
teams and members, and manage webhook subscriptions — over the **Productboard REST API v2**
(`https://api.productboard.com/v2`).

- **App id** `io.w6w.productboard` · **41 actions** · **1 auth method** · **3 declared health
  checks** (plus 1 derived `auth:*`)
- **Egress** `api.productboard.com` only. The status host is on the `service` check's own
  allowlist, never the app's.

## Which source this was built from

Productboard publishes a machine-readable OpenAPI document, and this app was built from it rather
than from the prose. Everything below was fetched and measured on **2026-08-11**.

`https://developer.productboard.com/v2/openapi` lists **nine** OpenAPI files, all
`openapi: 3.1.1`, `info.version: 2.0.0`, each declaring the single server
`https://api.productboard.com/v2`:

| File                       | Bytes   | Operations |
| -------------------------- | ------- | ---------- |
| `entities.yaml`            | 135,370 | 16         |
| `notes.yaml`               | 91,906  | 13         |
| `plugin-integrations.yaml` | 52,553  | 10         |
| `teams.yaml`               | 38,989  | 7          |
| `members.yaml`             | 28,311  | 3          |
| `webhooks.yaml`            | 26,797  | 4          |
| `jira-integrations.yaml`   | 22,313  | 4          |
| `analytics.yaml`           | 15,549  | 1          |
| `customer-scores.yaml`     | 13,102  | 1          |
| **total**                  |         | **59**     |

The prose reference at `https://developer.productboard.com/` (265,834 bytes) supplied the
authentication, pagination, rate-limit and migration pages, which the OpenAPI documents do not
cover. Nothing came from a third-party integration directory.

## Three things that would cost you a day

### 1. `X-Version` belongs to v1 — and all 119 v1 operations are deprecated

Productboard runs two API generations on the same host, and the version story is the opposite of
what a header called `X-Version` suggests.

- **v1** — unprefixed paths (`GET /features`), and `X-Version` is **required** on every request.
  Its OpenAPI document (`/v1.0.0/openapi/publicswagger.yaml`, 286,943 bytes) declares it
  `required: true` with `schema.enum: [1]`. One legal value — there is no "current" value to raise.
- **v2** — `/v2`-prefixed paths and **no version header at all**.

Asked the sharp way — *which version's pages lack a deprecation mark?* — the answer is
unambiguous:

| API | Operations | `deprecated: true` |
| --- | ---------- | ------------------ |
| v1  | 119        | **119**            |
| v2  | 59         | **0**              |

and the vendor's migration guide has a section headed *"No X-Version header required"*: *"v1
required an `X-Version` header on every request. In v2, you just call the endpoint directly — no
version header needed."* The string `X-Version` appears **zero** times across all nine v2
documents.

So this app is v2-only and never sends that header — `tests/index.test.ts` sweeps every source file
to keep it that way. Sending `X-Version: 1` to a v2 path is harmless but meaningless; building
against v1 because of it means building on 119 deprecated operations.

### 2. Four different auth failures, one status code, two body shapes — and one of them is the
undocumented one

Measured live against `api.productboard.com`:

| Request                                    | Status  | Body                                                 |
| ------------------------------------------ | ------- | ---------------------------------------------------- |
| no `Authorization` header                  | **401** | `{"message":"Unauthorized"}`                         |
| `Authorization: Bearer ` (empty)           | **401** | `{"message":"Unauthorized"}`                         |
| a non-JWT token, or a non-Bearer scheme     | **401** | `{"message":"Bad token; invalid JSON"}`              |
| a well-formed JWT with an unknown issuer    | **401** | `{"message":"No credentials found for given 'iss'"}` |
| a path that does not exist                  | 404     | `{"errors":[{"code":"route.notFound",…}],"id":…}`    |

Four causes, one status. Deciding "is this credential valid?" from the status code is impossible
here — the body is the only signal, which is what `auth/api-token.ts` classifies on.

Worse, **the shape the OpenAPI documents define for a 401 is not the shape the wire returns.** All
nine declare `UnauthorizedResponse` as `{id, errors: [{code: "auth.invalid", title, detail}]}`. The
gateway in front of the API answers `{"message": "..."}` instead. A client that parses only the
documented shape gets nothing at all from the most common failure it will ever see, so
`lib/client.ts` reads both.

One more from this family: `{"message":"Bad token; invalid JSON"}` is a message about *JSON* on a
request that had **no body**. It means "the string after `Bearer` is not a JWT" — Productboard
tokens are JWTs and the gateway parses them before routing.

### 3. `HEAD` is not routed, and v2 deletes cascade silently

Two unrelated traps, both of which flip a correct-looking design into a wrong one.

**`HEAD` 404s where `GET` 401s.** Measured on the identical URL:

```
GET  https://api.productboard.com/v2/entities  ->  401  {"message":"Unauthorized"}
HEAD https://api.productboard.com/v2/entities  ->  404  {"errors":[{"code":"route.notFound",...}]}
```

`HEAD` is the obvious verb for a reachability probe that does not want a body — and on this API it
reports a perfectly healthy route as a dead one, permanently. Every request this app makes, health
probes included, is a real `GET`, and both `tests/health/api.test.ts` and `tests/index.test.ts` pin
it.

**Deleting a feature deletes its subfeatures, with no warning.** This is new in v2. From the
vendor's own migration guide:

| Entity                      | v1 behaviour                    | v2 behaviour                          |
| --------------------------- | ------------------------------- | ------------------------------------- |
| Feature with subfeatures    | blocked — delete children first | **cascade** — subfeatures removed too |
| Release group with releases | blocked — error returned        | **cascade** — releases removed too    |
| Release with assignments    | blocked                         | release deleted, features unaffected  |

> *"If your integration relied on v1's safeguard behavior — for example, treating a blocked delete
> as a signal that children exist — that safety net is gone in v2. An accidental delete of a parent
> entity will now remove all its children without warning."*

There is no dry-run, no `force` flag and no undo. `entity-delete` therefore ships the vendor's own
suggested workaround — a `GET /v2/entities?parent[id]={id}` check that refuses and names what it
found — **on by default**. Turning it off costs one request and is the explicit way to say "yes,
take the subtree".

## Other findings worth knowing

- **The customer must exist before the note does.** v1's `Create a note` auto-created a user or
  company from `user.email` / `company.domain`. v2 does not: *"users and companies must exist
  before you can assign a note to them"*, and an unknown user is a **404** — so a 404 from
  `POST /v2/notes` usually means "unknown customer", not "wrong URL".
- **A note's product link uses the literal target type `"link"`.** `LinkTargetById` declares
  `type: {enum: ["link"]}`, so it is `{"type": "link", "target": {"type": "link", "id": "<feature
  uuid>"}}` — not `"feature"`. `note-relationship-create` fills that in for you.
- **A webhook's `events` is an array of objects**, `[{"eventType": "feature.updated"}]`, not of
  strings. `webhook-create` does the wrapping.
- **`fields` vs `fields[]`.** The response-field selector is spelled `fields` on `GET /v2/notes` and
  `GET /v2/notes/{id}`, and `fields[]` on `POST /v2/notes/search` and on every entities endpoint.
  Sending the wrong spelling is silently ignored. Both are pinned by tests.
- **Omitting `fields` does not mean "everything".** The documented default returns *only fields with
  a non-empty value*, so a `null` field is **absent** rather than null. Use `fields[]=all` when a
  downstream step keys off a field's presence.
- **Cursor-only pagination.** There is no `limit` and no `offset` anywhere in v2 — except
  `GET /v2/notes/{id}/relationships`, the single endpoint that accepts a `limit`. Every list action
  returns `nextPageCursor`, lifted out of the absolute `links.next` URL; `links.next` is `null` (not
  absent) on the last page.
- **PII comes back as the literal string `"[redacted]"`.** The vendor's `ObfuscatedValue` schema is
  an enum of exactly that one value, substituted when the token lacks the PII scope. A field reading
  `[redacted]` is a scope problem, not an address. (The document spells that scope two ways —
  `members:pii:read` and `members_pii:read` — in the same file.)
- **No whoami.** `/v2/me`, `/v2/users/me`, `/v2/workspace`, `/v2/workspaces`, `/v2/account` and
  `/v2/me/profile` all answer `404 route.notFound`. There is no way to ask which workspace a token
  belongs to, which is why this app derives no connection label and why its credential probe is a
  configuration read.
- **Secrets you write are never read back.** Both a webhook's `notification.headers.authorization`
  and a plugin integration's `action.headers.authorization` are documented as write-only and absent
  from every response. Pleasant, and unusual — several vendors in this pack return live credentials
  from an ordinary read. Keep your own copy.

## Authentication

One method, **`api-token`** (`type: "bearer"`) — `Authorization: Bearer <token>`.

Get a token from **Productboard > Workspace settings > Integrations > Public API > Access token**.
It is a JWT, so it is long and contains two dots; paste the whole string.

Productboard documents four authentication methods — personal API token, OAuth 2.0 authorization
code, OAuth server-to-server (JWT), and OAuth for MCP clients. **All four end in the same
`Authorization: Bearer` header**, so a token from any of them works in the field above.

**OAuth 2.0 is deliberately not declared as a separate method**, for a specific and checkable
reason rather than convenience. The `OAuth2` security scheme in the v2 documents declares exactly
three scopes — `entities:read`, `write:entities`, `entities:delete` — identically in all nine files
including `notes.yaml`, `teams.yaml` and `analytics.yaml`. But the per-operation `security` blocks
in those same files require `notes:read`, `notes:write`, `notes:delete`, `teams:read`,
`teams:write`, `teams:delete`, `members:read`, `members:pii:read`, `webhooks:read`,
`webhooks:write`, `webhooks:delete`, `analytics:read`, `jira-integrations:read`,
`plugin-integrations:read/write/delete` and `fields:write` — none of which appear in the OAuth2
scope list. The two halves also disagree on spelling (`write:entities` vs `entities:write`). A
manifest built from that list would mint tokens missing the scope for most of this app's surface,
and the document gives no way to tell which spelling the authorization server accepts. That is a
question for the vendor, not a guess to ship.

### The credential probe

`GET /v2/entities/configurations`, chosen by reading the response schema, not the endpoint name:

- **It requires a credential** — unauthenticated it answers `401 {"message":"Unauthorized"}`,
  measured live. (Every v2 path does; there is no public corner of this API. It was measured rather
  than assumed.)
- **It returns no customer data and no personal data** — only the *shape* of the workspace: each
  entity type's fields, types, validation rules and supported patch operations. The obvious
  alternatives are worse on exactly this axis: `GET /v2/members` returns every member's email
  address, and `GET /v2/entities` returns the workspace's roadmap.
- **It carries no credential material.** Productboard's two write-only secrets are documented as
  never returned in any response, and neither lives on this path regardless.
- **It needs no id**, so it cannot break when a particular feature is archived.

Its scope is `entities:read` — the narrowest scope a useful Productboard connection cannot lack.

## Health checks

| Key       | Kind         | Credential | What it answers                                            |
| --------- | ------------ | ---------- | ---------------------------------------------------------- |
| `service` | `service`    | `none`     | Is Productboard up, per its Statuspage?                    |
| `api`     | `dependency` | `none`     | Is `api.productboard.com` reachable and still routing v2?  |
| `quota`   | `quota`      | `signed`   | How much per-token request-rate headroom is left?          |
| `auth:api-token` | derived | —      | Is this credential live? (projected from the `test` hook)  |

### `service` — the status page is real, checked three ways

Productboard publishes at **`status.productboard.com`**, an Atlassian Statuspage.

**(a) Is it a catch-all?** No:

| Path                                   | Status  | Bytes | md5 (first 12) |
| -------------------------------------- | ------- | ----- | -------------- |
| `/api/v2/summary.json`                 | 200     | 6,225 | `40b773b00529` |
| `/api/v2/status.json`                  | 200     | 224   | `42043acefa7c` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |

**(b) Content-type and body:** `application/json; charset=utf-8`, parsing as the Statuspage v2
schema. Neither unclaimed-host signature matches (an unclaimed `*.statuspage.io` is ~127,700 B of
HTML; an unclaimed `*.instatus.com` ~216,800 B).

**(c) Does it describe this product?** `"page": {"id": "wwwnvh1nlpt1", "name": "Productboard"}`.

**Does a component cover the API?** Yes — **`MCP, APIs and Integrations`**
(`component:x5zhztnyv1dd`), which the check declares in its `covers` so a host can attribute a
failure to the API rather than greying out the app because the marketing site is down. The page
carries 17 components: five first-party (`Spark AI`, `Web Application`,
`MCP, APIs and Integrations`, `Identity & Access`, `Website (www.productboard.com)`), one group
container, and **eleven external services** — Anthropic's Claude API, Stripe, Cloudflare Workers,
AWS RDS, AWS EC2, both Pusher Channels APIs, Slack, both Intercom APIs and SendGrid. Those are
genuinely upstream of Productboard so they are reported, keyed by the vendor's own component id so
`SendGrid API` can never be mistaken for a Productboard service.

The verdict comes from `status.indicator` — Productboard's own roll-up — not from the worst
component, because deriving it from the component list would report Productboard down whenever
Stripe has a bad day. A status page that itself 500s reports `unknown`, never `down`.

The status host is declared on **this check's** `network.allow`, never on the app's.

### `api` — why an unsigned 401 is a pass

Deliberately unauthenticated, so a schema-correct authentication error is the *success* case: it
proves DNS resolved, TLS completed, the gateway is up and the route exists. Whether the credential
is any good is the derived `auth:*` check's job; conflating the two is how "the API is down" gets
reported as "your token expired".

The route check earns its place on this vendor because a nonexistent v2 path answers `404
route.notFound` **before** authentication — so one unsigned `GET` separates the two outcomes
cleanly:

| Unsigned `GET /v2/entities/configurations` | Verdict    |
| ------------------------------------------ | ---------- |
| 401 `{"message":"Unauthorized"}`           | `ok`       |
| 404 `route.notFound`                       | `down`     |
| 5xx or a transport failure                 | `down`     |
| 200 with no credential                     | `degraded` |
| anything else                              | `unknown`  |

The `200` row is not paranoia: if this path stopped requiring a credential, the credential probe
would silently become a no-op.

### `quota` — declared, but `informational`, and here is exactly why

The vendor's Rate Limits page documents **50 requests/second per access token** — the only meter in
this API — plus `X-RateLimit-Limit`, `X-RateLimit-Remaining` and (when throttled) `Retry-After`.

**Their presence on an authenticated 200 could not be verified.** None of the nine v2 OpenAPI
documents declares a single response header (zero occurrences of `X-RateLimit`; `Retry-After`
appears once in the whole corpus, in the **v1** document), and they could not be observed on the
wire either, because every response reachable without a token is a gateway `401`, which carries
none of them.

So the check reports **`unknown`, never `ok`,** when the headers are absent — "no headroom
information" is not "plenty of headroom" — and carries `severity: "informational"` so that expected
`unknown` cannot pin the app's roll-up verdict forever. Declaring it `unavailable` instead would be
wrong in the other direction: the vendor does publish these headers in its own reference, and a
declared absence would stop anyone ever looking. The 10%/25% warning bands are this app's choice,
stated in `health/quota.ts`, not the vendor's.

## Actions

All 41 are v2. Grouped by resource; every list action returns `{items, nextPageCursor, hasMore}`.

### Entities (14) — the unified product hierarchy

v2's headline change: products, components, features, subfeatures, initiatives, objectives, key
results, releases, release groups, companies and users are all one endpoint, filtered by `type[]`.

| Action                       | Endpoint                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| `entity-configuration-list`  | `GET /entities/configurations`                              |
| `entity-configuration-get`   | `GET /entities/configurations/{type}`                       |
| `entity-list`                | `GET /entities`                                             |
| `entity-get`                 | `GET /entities/{id}`                                        |
| `entity-create`              | `POST /entities`                                            |
| `entity-update`              | `PATCH /entities/{id}`                                      |
| `entity-delete`             | `DELETE /entities/{id}` — **cascades**; guarded by default  |
| `entity-search`              | `POST /entities/search`                                     |
| `entity-field-value-list`    | `GET /entities/fields/{id}/values`                          |
| `entity-score-get`           | `GET /entities/{id}/score` — vendor-marked **beta**         |
| `entity-relationship-list`   | `GET /entities/{id}/relationships`                          |
| `entity-relationship-create` | `POST /entities/{id}/relationships`                         |
| `entity-parent-set`          | `PUT /entities/{id}/relationships/parent`                   |
| `entity-relationship-delete` | `DELETE /entities/{id}/relationships/{type}/{targetId}`     |

**Start with the configuration endpoints.** v2 is configuration-driven: which fields an entity has,
their types, their validation rules and which patch operations each accepts are properties of *your
workspace*, and custom fields appear as bare UUID keys — a response containing
`"faa1d59a-…": 120` is meaningless until `entity-configuration-get` tells you that UUID is
"Estimated effort".

**`fields` replaces, `patch` operates.** On `entity-update` and `note-update`, `{"tags": [...]}`
sets the tag list to exactly that; `[{"op": "addItems", "path": "tags", ...}]` adds to it. Reaching
for the first when you meant the second is how a workflow silently deletes every tag but the one it
was adding.

**Re-parenting is a `PUT`, not a `POST`.** An entity has at most one parent, so
`POST .../relationships` with `type: "parent"` answers `409` once one exists — `entity-parent-set`
is the replace.

### Notes (11) — customer feedback

| Action                     | Endpoint                                                        |
| -------------------------- | --------------------------------------------------------------- |
| `note-configuration-list`  | `GET /notes/configurations`                                     |
| `note-list`                | `GET /notes`                                                    |
| `note-get`                 | `GET /notes/{id}`                                               |
| `note-create`              | `POST /notes`                                                   |
| `note-update`              | `PATCH /notes/{id}`                                             |
| `note-delete`              | `DELETE /notes/{id}`                                            |
| `note-search`              | `POST /notes/search`                                            |
| `note-comment-create`      | `POST /notes/{id}/comments` — **write-only**                    |
| `note-relationship-list`   | `GET /notes/{id}/relationships`                                 |
| `note-relationship-create` | `POST /notes/{id}/relationships`                                |
| `note-relationship-delete` | `DELETE /notes/{id}/relationships/{targetType}/{targetId}`      |

`processed=false` on `note-list` is the triage inbox — notes nobody has linked to the hierarchy
yet. Both `processed` and `archived` default to *unfiltered*, so leaving either empty returns both
states.

`note-search` is where v1's `term` parameter went: it is now `data.search.query` in the POST body.

### Members and teams (7)

`member-list`, `member-get`, `member-search`, `team-list`, `team-get`, `team-search`,
`team-member-list`. Both surfaces are v2-only — v1 had neither.

`member-list`'s three include-flags (`includeDisabled`, `includeInvitationPending`,
`includeInvited`) are independent axes, all defaulting to `false`; a seat-list reconciliation needs
all three or it will conclude half the org does not exist.

### Webhooks (4)

`webhook-list`, `webhook-get`, `webhook-create`, `webhook-delete`. There is **no update
endpoint** — changing a subscription means delete-and-recreate, re-supplying the outbound
authorization header because Productboard never returned it. `webhook-create` takes that header as a
`json` param marked `secret: true`, so the host masks and encrypts it.

### Analytics and integrations (5)

`member-activity-list` (`GET /analytics/member-activities` — the whole Analytics API, one endpoint,
behind its own `analytics:read` scope), `jira-integration-list`,
`jira-integration-connection-list`, `plugin-integration-list`,
`plugin-integration-connection-list`.

`jira-integration-connection-list` is the mapping table between Productboard entities and Jira
issues, searchable from either end (`issueKey`, `issueId`).
`plugin-integration-connection-list` with `state[]=error` is "which plugin links are broken now".

## What is deliberately left out, and what that does and does not cover

Nothing here was omitted because it could not be verified — the nine OpenAPI documents cover the
whole v2 surface. These are scope decisions, stated so nobody has to rediscover them:

- **The whole v1 API.** All 119 of its operations are `deprecated: true`. Two capabilities exist
  only there and are therefore not available through this app: **note followers** and **feedback
  forms**, both of which the vendor lists as *removed from v2 with no plans to return*. Company
  custom-**field definition** management (create/update/delete a field) is also v1-only, but is
  documented as *temporarily* absent — reading and writing **values** of existing custom fields
  works fine through `entity-update`.
- **Tag filtering on note search.** Not this app's omission: v1's `anyTag` / `allTags` have no v2
  equivalent yet, and the vendor lists it under "removed endpoints planned for a future release".
  Filter by type, id, date range, fields, metadata or relationships instead.
- **The plugin-integration write surface** (`POST`, `PATCH`, `DELETE /plugin-integrations`, and the
  connection-state `PUT`/`DELETE`). Registering a plugin integration is a build-time act of
  registering an application, not a workflow step, and updating an `action` on an `enabled`
  integration makes Productboard send a live probe to whatever URL was supplied. The read half is
  exposed. This exclusion is about those five write operations only — everything the read
  operations return is available.
- **Entity field-value writes** (`POST`/`PATCH`/`DELETE /entities/fields/{id}/values`), which edit
  the workspace's select-option vocabulary rather than any record. The read (`entity-field-value-list`)
  is exposed so a write can pick a real option instead of guessing.
- **Triggers.** This app declares actions and health checks only. Productboard's webhook
  subscriptions are managed here as ordinary actions; wiring them into a w6w `TriggerDefinition`
  needs the trigger RFC and was not asked for.
- **`GET /v2/teams` writes** (`POST`/`PATCH`/`DELETE /teams`): team lifecycle is org administration,
  not workflow. `team-list` / `team-get` / `team-search` / `team-member-list` cover reading.

## Icon

`assets/icon.svg` is `https://www.productboard.com/favicon.svg` downloaded **verbatim** on
2026-08-11 — 323 bytes, `image/svg+xml`, md5 `0ac7a96384dcd97877586ac474c140d8`, a `0 0 32 32`
viewBox of three coloured paths (`#0071E1`, `#FFC600`, `#F84136`). `tests/index.test.ts` pins the
byte length and all three colours, so a redraw fails the suite. Nothing was invented and nothing was
reformatted — use `deno task fmt` (which scopes to the source directories), never a bare `deno fmt`,
which would rewrite this file.

## Development

```bash
deno task validate   # manifest + sandbox audit
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # 221 unit tests, mocked HookContext, no network
```
