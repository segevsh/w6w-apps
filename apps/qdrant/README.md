# Qdrant

The vector database you can actually run — search, upsert, filter and back up
collections on Qdrant Cloud or your own instance.

- **Categories** — search, databases, ai
- **Auth methods** — api-key
- **Actions** — 19
- **Egress allowlist** — `*.cloud.qdrant.io`, `*`
- **Website** — https://qdrant.tech
- **API docs** — https://api.qdrant.tech/api-reference

Built against **Qdrant's own OpenAPI document**
(`github.com/qdrant/qdrant`, `docs/redoc/master/openapi.json`, 53 paths,
fetched 2026-08-18) — the generated reference on api.qdrant.tech is the same
document rendered.

> **On the allowlist.** Qdrant is open source and self-hostable, so the instance
> can be at any hostname. `*.cloud.qdrant.io` covers Qdrant Cloud; the trailing
> `*` is what admits a self-hosted one. This is the same shape `supabase` and
> `elastic` use in this pack, and it is a real widening — an app pinned to one
> vendor's domain cannot reach an instance running in your own VPC, and Qdrant's
> whole point is that it can run there.

## Setup

### URL

Qdrant Cloud → your cluster → **Connect**. The connection string it shows
already includes the port:

```
https://xyz-abc.eu-central-1.aws.cloud.qdrant.io:6333
```

**The port is load-bearing.** Qdrant serves REST on **6333** and gRPC on
**6334**, and a URL with no port at all goes to 443 — which on a self-hosted
instance is usually nothing listening. The app fills in `:6333` when a URL
arrives without one, which is right far more often than it is wrong, and says so
in the field hint.

### API Key

Qdrant Cloud → cluster → **API Keys**. It is sent in an **`api-key` header**,
not `Authorization: Bearer` — a detail worth stating because every other
database in this pack uses the latter, and a key sent the usual way is simply
ignored.

**Keys are read-write or read-only.** A read-only key connects, passes the
connection test, passes both health checks, and lists every collection — and
then fails on the first upsert. There is nothing in a read key's behaviour that
distinguishes it until a write is attempted, so the 401/403 message this app
produces names the possibility explicitly rather than repeating Qdrant's
"Invalid api key".

A self-hosted instance started without `QDRANT__SERVICE__API_KEY` has **no
authentication at all** and accepts any key, including a wrong one. That is a
deployment choice and not something this app can detect; it is worth knowing
before concluding from a successful connection test that the key is right.

## `points/query` is the endpoint — most tutorials show the old ones

Qdrant used to have three search endpoints: `points/search`, `points/recommend`
and `points/discover`. It now has **one**. From the spec's own description of
`POST /collections/{name}/points/query`:

> Universally query points. This endpoint covers all capabilities of search,
> recommend, discover, filters. But also enables hybrid and multi-stage queries.

The old paths are **gone from the current spec** while a great deal of published
example code still uses them. This app calls `query` only, and a test walks
every action file asserting none of the retired paths appear.

## `with_payload` defaults the opposite way on two endpoints

Same API, same concept, two defaults:

| Endpoint | Qdrant's default | What that means |
| --- | --- | --- |
| `points/query` | `with_payload: false` | ids and scores, **no data** |
| `points/scroll` | `with_payload: true` | the whole point |

A workflow that searches and then reads a field off each result gets
`undefined`, and nothing failed — the search returned results, they just have
nothing in them. The ids-only form is a deliberate optimisation for a caller
that is about to fetch the documents from somewhere else; it is not a sensible
default for somebody assembling a workflow.

So **`point-query` defaults `withPayload` to true**, against the API, and the
action description says which way Qdrant leans.

## Writes return before they are applied

`wait` defaults to **false** on upsert, delete and payload updates. The call
returns as soon as Qdrant has accepted the operation into its queue — not once
it is queryable. "Upsert, then immediately search for it" therefore fails to
find the point, intermittently, in a way that looks like a search bug.

Every write action here defaults `wait` to **true**, which is what a sequential
workflow already assumes. It remains a parameter, because a bulk load of a
million points genuinely does not want to block on each batch.

## Point ids are integers or UUIDs, and nothing else

Qdrant accepts a non-negative integer or a UUID as a point id. Not a URL, not a
filename, not `order-4471`, not a slug. This catches nearly everyone once,
because the payload accepts arbitrary strings happily and the id looks like it
should too.

The app validates ids **before** the request, and the error says what to do
about it rather than repeating Qdrant's parse failure:

> `ids` must be a non-negative integer or a UUID — Qdrant accepts nothing else.
> For a natural key like a URL or filename, hash it into a UUID and keep the
> original in the point's payload

## Deleting

Three separate guards, because a vector database's recovery story is
re-embedding the corpus — real money and real hours, not a restore button:

- **`collection-delete` asks for the name twice.** A typo'd workflow parameter
  is how the wrong collection gets destroyed, and repeating the name is what
  catches it. The error prints both strings so the difference is visible.
- **`point-delete` by filter needs an acknowledgement.** A filtered delete
  removes everything matching, and a filter with a typo'd field name silently
  matches *nothing* — so the failure mode runs both ways.
- **An empty filter object is refused outright**, in `point-delete`,
  `payload-set` and `payload-delete`. `{}` is valid to Qdrant and matches every
  point in the collection.

`snapshot-create` exists so that "take a backup, then do the destructive thing"
is one workflow. It waits by default, because a snapshot that has not finished
is not a backup.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `collection-list` | read | Collection names in the instance |
| `collection-get` | read | Configuration and state — `green`, `yellow`, `red` |
| `collection-exists` | read | A boolean, so a 404 is not conflated with a bad key |
| `collection-create` | perform | Vector size and distance, both permanent |
| `collection-delete` | perform | Destroys every vector; name required twice |
| `point-query` | search | The one search endpoint — filters, hybrid, multi-stage |
| `point-upsert` | perform | Insert or **replace** points |
| `point-get` | read | Fetch by id, and report which ids were missing |
| `point-scroll` | read | Walk a collection for exports and re-embeds |
| `point-count` | read | Exact by default, not Qdrant's index estimate |
| `point-delete` | perform | By id, or by an acknowledged filter |
| `payload-set` | perform | Merge fields without touching the vector |
| `payload-delete` | perform | Remove fields — what a retention rule needs |
| `index-create` | perform | Make a filtered field fast |
| `alias-list` | read | Which names point at which collections |
| `alias-update` | perform | Move an alias atomically — the zero-downtime re-index |
| `snapshot-create` | perform | Back up a collection |
| `snapshot-list` | read | What backups exist, how old, and how much disk |
| `instance-info` | read | Server version and build |

### Things the actions do that the API does not

- **`point-count` asks for the exact count.** Qdrant's default is an
  **estimate** from the index, and the response is a number either way — there
  is nothing in it to tell you which you got. A dashboard can live with an
  estimate; a workflow branching on "are there any" cannot. The estimate stays
  available, and the action returns `exact` so the caller knows.
- **`point-get` reports the ids that did not come back.** Asking for five and
  receiving three is a `200`.
- **`collection-get` returns `ready`.** `yellow` means the optimiser is still
  building: the collection answers queries, slowly and from a partial index,
  which is exactly what a fresh bulk load looks like. Only `green` is ready.
- **`alias-update` sends the delete and the create in one batch**, which Qdrant
  applies atomically, so no reader ever sees the alias resolving to nothing. It
  does **not** delete the old collection — that keeps costing memory until
  somebody acts, which is the point of the two-step but worth saying out loud.
- **`snapshot-list` totals the bytes.** Qdrant never expires snapshots.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Qdrant **Cloud** — console, provisioning, and the region grid |
| `instance` | dependency | connection | context | Is this Qdrant **ready** — `readyz`, falling back to `livez` |
| `collections` | dependency | connection | signed | Can this key read the instance, and is anything in it |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

`instance` is unauthenticated on purpose: whether the server is up is a
different question from whether the key is good, and answering them together
means a rotated key reads as an outage. It probes `readyz` and, when that fails,
`livez` — because "still starting" and "gone" need different responses, and a
restarting Qdrant is alive long before it can answer a query.

`collections` reports an instance with **no collections** as `degraded` rather
than `ok`. That is correct for a new deployment and it is also exactly what an
instance that lost its storage volume looks like — and `instance` will happily
call that one healthy, because an empty Qdrant is a perfectly ready Qdrant.

`service` reads **status.qdrant.io**, which is a **Better Stack** page and not
the Atlassian Statuspage the rest of this pack trains you to expect. Probed live
2026-08-18, every Statuspage-shaped path on that host — `/api/v2/summary.json`,
`/status.json`, `/definitely-not-real-zzz.json` — answers `200` with the same
983,546-byte HTML document. The real route is `/index.json`, 108,811 bytes of
JSON that names the company. So "a bogus sibling 404s" cannot be the
discriminator, and the check instead requires Better Stack's own
`data.attributes` shape *and* a page that self-identifies as Qdrant's. If that
route ever disappears, this reports `unknown` rather than parsing a web page
forever.

The page has two sections, and neither one is authoritative for a given
connection:

- **Current status by service** — Website / Documentation, Cloud UI, Cloud API
  (extern). The **control plane**. A cluster keeps serving queries while all
  three are down.
- **Cloud Qdrant Database Clusters** — one resource per region (`AWS us-east-1`,
  `GCP europe-west3`, `Azure uksouth`, …) plus `Hybrid Cloud`. These are what a
  query depends on — but this hook is `scope: "app"`, so it has no connection
  and therefore no region. And most Qdrant instances are self-hosted, for which
  the entire page is irrelevant.

So everything is reported as components and **capped at `degraded`**, with
`severity: "informational"`. The one exception is *every* cluster region down at
once, which is no longer a "which region are you in" question and is reported as
`down`. `apps/pinecone` makes the same call for the same reason.

`quota` is declared unavailable with the evidence in the `unavailable.reason`:
across the OpenAPI document's 53 paths there is no endpoint reporting remaining
request headroom. `GET /metrics` (Prometheus text) and `GET /telemetry` answer
"how is this instance doing" and are not quotas; `GET /quotas` manages
strict-mode limits an operator sets on *themselves* — configuration, not
consumption. A self-hosted database's limits are memory, disk and index size,
which belong to the host's monitoring. It carries `severity: "informational"`,
so a declared absence does not leave the app at `unknown` forever.

## Icon

`assets/icon.png` — 180×180, the Qdrant mark, checked with
`_tools/icon-legibility.ts`.

## Tests

187 assertions across 25 files: one per action, one per auth method, one per
health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook — plus two Qdrant-specific ones: nothing calls a retired search path, and
nothing logs a payload, a vector or a point.
