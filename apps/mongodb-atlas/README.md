# MongoDB Atlas

Manage MongoDB Atlas's control plane: projects and clusters, database users and
IP access lists, alerts, events, and the processes behind a cluster.

- **Categories** — databases, devops
- **Auth methods** — service-account
- **Actions** — 19
- **Egress allowlist** — `cloud.mongodb.com`, `status.mongodb.com`
- **Website** — https://www.mongodb.com/products/platform/atlas-database
- **API docs** — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/

Built against MongoDB's own OpenAPI document (`github.com/mongodb/openapi`,
`openapi/v2.json`, 335 paths) and probed live against `cloud.mongodb.com`, both
on 2026-08-19.

## This is the control plane, not the database

Nothing here reads or writes a document. Querying data means a MongoDB **driver**
speaking the wire protocol to `mongodb+srv://…` — a different protocol on a
different port, which an HTTP app cannot do. What this API does is provision,
grant access, and report.

That is the useful half for a workflow anyway: create the cluster, mint the
credential, open the address, watch the alerts, pause it overnight. The
`index.ts` suite asserts no action claims a `document`, `collection` or `query`
resource, so the boundary cannot drift by accident.

## Versioning is a date, per endpoint, in the Accept header

```
Accept: application/vnd.atlas.2025-03-12+json
```

Not a URL segment, not a custom header, and **not one version for the whole
API**. Counted across the spec:

| Version | Operations |
| --- | --- |
| `2023-01-01` | 319 |
| `2025-03-12` | 78 |
| `2024-08-05` | 54 |
| `2024-11-13` | 19 |

The trap is that pinning an **old** date is what breaks. An endpoint introduced
afterwards does not exist at that version, and the 404 says nothing about
versions — `flexClusters` exists *only* from `2024-11-13`. Omitting the header
is worse: the API falls back to the oldest version and the response shape rolls
back years.

So this app sends a recent date by default and raises it per action where the
endpoint requires more (`cluster-list` at `2024-08-05`, `flex-cluster-list` at
`2024-11-13`, `cluster-create` at `2024-10-23`). It never lowers it. The 404
message names the version it asked for, because nothing else will.

## `cluster-list` does not list every cluster

Flex clusters — the tier that replaced M2 and M5 — are at their own path, and
`/clusters` gives no sign they exist. An inventory built the obvious way is
silently incomplete: not truncated, but complete for a category the caller did
not know was a category. `flex-cluster-list` is the other half, and
`cluster-list`'s own description says so.

## Digest is offered, and cannot be used here

An unauthenticated call answers:

```
www-authenticate: Digest realm="MMS Public API", nonce="…", qop="auth"
```

That is Atlas's original API-key scheme. HTTP Digest is challenge-response —
request, 401 carrying a nonce, re-request with a hash of it — and a `sign` hook
is handed one request and no challenge. It is not awkward here, it is
**unimplementable**, which is why this app takes service accounts only.

And the token exchange has its own trap, measured:

| Credentials sent as | Result |
| --- | --- |
| HTTP Basic header | works |
| `client_id`/`client_secret` in the body | **400** `"No Authorization header provided"` |

Both forms are legal OAuth. Atlas accepts only the first, and the error for the
second names a missing header rather than the credentials — which reads like a
bug in the client.

## Projects are called `groups`

The console says project; every path says `groups`. The name predates Atlas —
MongoDB Cloud Manager called them groups — and searching the docs for "project"
finds prose while the URLs say otherwise. The id is a 24-character hex ObjectId,
and this app validates its shape before sending, because **Atlas validates ids
after authorisation**: a typo comes back as a 401 and reads as an expired token.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `organization-list` | read | What this service account can reach at all |
| `project-list` | search | Projects, and how a name becomes an id |
| `project-get` | read | One project |
| `cluster-list` | search | Dedicated clusters — *not* the flex ones |
| `cluster-get` | read | One cluster, with its connection host |
| `cluster-create` | perform | Provision one, billing hourly from now |
| `cluster-update` | perform | Scale it, or change its protection |
| `cluster-pause` | perform | Stop or restart compute billing |
| `cluster-delete` | perform | Destroy it and its data |
| `flex-cluster-list` | search | The other half of the inventory |
| `database-user-list` | read | Who may connect |
| `database-user-create` | perform | Mint or rotate a database credential |
| `database-user-delete` | perform | Revoke one |
| `access-list-get` | read | The perimeter |
| `access-list-add` | perform | Let an address through |
| `access-list-delete` | perform | Close one off |
| `alert-list` | read | What Atlas is unhappy about now |
| `event-list` | search | Who changed what, and when |
| `process-list` | read | The nodes, and which is primary |

### Things the actions do that the API does not

- **`cluster-create` requires the instance size explicitly and defaults
  termination protection ON**, against Atlas's own default. There is no safe
  default tier for something that bills hourly, and a cluster created by an
  automation is one nobody is watching. It also flattens Atlas's three-deep
  `replicationSpecs[].regionConfigs[].electableSpecs` into three parameters for
  the single-region case, leaving the raw shape available for anything else.
- **`cluster-update` reads `stateName` first and refuses when it is not
  `IDLE`.** Atlas answers 409 to a change during `UPDATING`, and a cluster stays
  `UPDATING` for minutes after any previous change — so "change it, then change
  it again" fails, and naming the state is more use than passing the 409
  through. Turning termination protection *off* needs its own acknowledgement,
  because that is the first half of deleting the cluster.
- **`cluster-delete` checks termination protection before calling**, so the
  refusal explains itself, and it **keeps backup snapshots by default**. Without
  that, the snapshots go with the cluster and no copy of the data is left
  anywhere.
- **`cluster-pause` reads the state first** and reports `changed`, because a
  scheduled pause running against an already-paused cluster should not look like
  a failure. Its docs carry the two scheduling traps: Atlas **auto-resumes a
  paused cluster after 30 days**, and refuses to re-pause one for **60 minutes**
  after it resumes — so a 09:00-resume, 09:30-pause schedule fails every day.
- **`database-user-create` upserts**, matching on username **and**
  authentication database, since those two together are the identity. It refuses
  to run without a password rather than generating one it would then have to
  hand back through a workflow's data, and warns when `scopes` is empty —
  because an unscoped user reaches **every cluster in the project, including
  ones created later**.
- **`database-user-delete` says what revocation does not do.** Existing
  connections are not closed; this stops the next authentication. A running
  application keeps working until something makes it reconnect, so a revocation
  that appears to have done nothing has done its full job, later.
- **`access-list-add` gates `0.0.0.0/0`** — one character from adding a single
  office IP, and it removes the perimeter for every cluster in the project. It
  requires a comment (an access list of unexplained CIDR blocks can never be
  pruned) and warns when no expiry is set, because nothing else will remember to
  remove what a workflow added. The request body is a **bare array**, which is
  unusual enough that the obvious first attempt is rejected.
- **`access-list-delete` encodes the CIDR slash into the path.** A hand-rolled
  URL usually does not, and the result is a 404 for an entry plainly in the list.
- **`alert-list` defaults to `OPEN`**, which Atlas does not — unfiltered, the
  list is mostly resolved history. `TRACKING` is the status people miss: the
  condition is met and the alert is inside its notification delay.
- **`process-list` names the primary**, which is the only place this API says
  which node it is, and flags mixed versions across nodes as a rolling upgrade
  rather than a misconfiguration.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is MongoDB Cloud up |
| `credential` | credential | connection | signed | Is the token accepted — and can it see anything |
| `quota` | quota | connection | none | Declared unavailable — no header exists |

### `service`

Reads `status.mongodb.com`'s `summary.json`, which here is genuinely the right
route: measured, it and `components.json` both return the same **9** components,
so nothing is truncated away.

It watches `MongoDB Cloud` (the console and this API) and `MongoDB Atlas Search`
separately, and ignores Charts, App Services, Data Federation and the rest —
separate products on the same board.

What it deliberately does **not** answer is whether your clusters are reachable.
A driver reaches a cluster directly over the wire protocol, a path that does not
touch `cloud.mongodb.com`. The control plane can be down while every cluster
serves traffic normally, and the page can be green while one cluster is
unreachable. Hence `informational` severity: an outage here stops changes, not
queries.

### `credential`

A service-account token lasts **an hour** — the shortest-lived credential in
this pack — so "has this been revoked" is joined by "did the refresh happen",
and both look identical from an action.

It distinguishes three outcomes rather than two:

| | |
| --- | --- |
| 401 | not accepted — expired, revoked, or a deleted service account |
| 200, empty list | **works and can see nothing**: created, never granted a role |
| 200, organisations | working |

The middle one is the state nothing else reports. The credential is perfect and
the account is useless; every action returns a 403 or an empty result and no
error ever mentions it.

### `quota` — declared unavailable

MongoDB documents 100 requests per minute **per project** and publishes no
header for it: verified live, no `x-ratelimit-*`, no `ratelimit`, no
`retry-after` before a 429 happens. There is nothing to sample.

It is also rarely the binding constraint. A cluster refuses changes while it is
not `IDLE`, and that takes minutes — so a **409 arrives long before a 429**.
Atlas's real budget is cost, which the billing endpoints report after the fact
rather than as headroom.

## Icon

`assets/icon.svg` is MongoDB's leaf mark, the single path copied **verbatim**
out of the horizontal lockup at
`https://webimages.mongodb.com/_com_assets/cms/kuyjf3vea2hg34taa-horizontal_default_slate_blue.svg`
(fetched 2026-08-19), wrapped in an `<svg>` carrying the mark's own bounding box
— `viewBox="0 0 120 257"`, computed by sampling the path's curves rather than
guessed. Only the wordmark paths were dropped; the mark itself is unmodified.
`assets/icon.dark.svg` is the reversed variant generated by
`_tools/icon-legibility.ts`.

## Tests

440 assertions across 25 files: one per action, one per auth method, one per
health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no action touching
a credential — plus three specific to this app: **every destructive or
perimeter-widening path still has its gate**, **no action claims to read
documents**, and **nothing logs a password, a connection string or a record
set**, checked on the log call's values rather than its keys.
