# Typesense

Search collections, index documents, and manage the collections, aliases and
API keys around them.

- **Categories** — search, databases
- **Auth methods** — api-key
- **Actions** — 16
- **Egress allowlist** — `*`
- **Website** — https://typesense.org
- **API docs** — https://typesense.org/docs/

Built against Typesense's own OpenAPI spec (v30) and its cluster-operations
documentation, read on 2026-08-19.

> **On the allowlist.** Typesense is open source and mostly self-hosted, so a
> node can be at any address at all. Same reasoning as `apps/mastodon` and
> `apps/looker`.

## Two behaviours that make a workflow quietly wrong

### A bulk import answers 200 when every document failed

`POST /documents/import` returns **HTTP 200** with a JSONL body, one line per
document, in the order they were sent:

```
{"success": true}
{"success": false, "error": "Bad JSON.", "document": "[bad doc"}
```

Typesense's spec is explicit that a failure "does not affect the other
documents" — good behaviour for a bulk endpoint, and a trap for a workflow
step, which checks the status code and reports that ten thousand documents
landed when none of them did.

`document-import` reads every line and **fails the step** when any document was
rejected, unless `allowPartial` says otherwise. A partial write into a search
index is worse than no write: the index looks fresh and is missing records
nobody knows about.

### Search silently answers a shorter question when results are thin

Two defaults, both from the spec, and neither visible in the response:

| Setting | Default | What it does |
| --- | --- | --- |
| `drop_tokens_threshold` | 10 | Below 10 hits, **drops words from the query** until it finds enough |
| `typo_tokens_threshold` | 100 | Below 100 hits, starts allowing **more typos** |

A search for "red waterproof hiking boots" can return every boot, ranked as
though it matched. For a shop's search box that is right — an empty page is
worse than an approximate one. For a workflow that *acts* on the result —
matching an incoming order to a product, deduplicating records — it is a
correctness problem, because the hit is not what was asked for and carries no
mark saying so.

`document-search` exposes both, leaves Typesense's defaults alone, flags a
result thin enough to have been widened, and offers **`strict`**, which sets
both to zero in one switch.

## The credential is a header, and it is scoped

`X-TYPESENSE-API-KEY`, not a bearer token — Typesense answers the same 401
either way, so a client that sends `Authorization` gets a message that says
nothing about the header being wrong.

Typesense keys carry an **action list** and a **collection list**. The shapes
that matter: `documents:search` on one collection is safe to ship to a browser;
`documents:*` is an indexer; `*` on `*` can drop every collection. The auth test
reports which kind this is, because a connection that can search and cannot
index is a reasonable thing to have and a confusing thing to debug at the first
write.

The test probes `/collections` rather than `/health` — `/health` needs no key,
so a credential test written against it would pass with no credential at all.

## Self-hosted listens on 8108

A bare hostname is assumed self-hosted and gets `https://` and `:8108`.
Typesense Cloud serves on 443, so a full URL or an explicit port is left alone.
Getting it wrong is a connection refused that reads as the server being down,
which both the auth test and the `node` health check say out loud.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `document-search` | search | Search a collection, with the widening under control |
| `multi-search` | search | Several searches in one request |
| `document-get` | read | One document by id — the only exact read |
| `document-upsert` | perform | Write one document |
| `document-import` | perform | Bulk write, with the 200-hides-failures trap handled |
| `document-delete` | perform | Delete by id, or by filter with a dry run |
| `collection-list` | search | Collections and their document counts |
| `collection-get` | read | The schema every search and write must satisfy |
| `collection-create` | perform | Define a collection |
| `collection-delete` | perform | Drop one, and say which aliases break |
| `alias-list` | read | Aliases, and which point at nothing |
| `alias-upsert` | perform | The swap in a zero-downtime reindex |
| `key-list` | search | Keys by prefix, and what each may do |
| `key-create` | perform | Mint a scoped key |
| `key-delete` | perform | Revoke one, immediately |
| `node-stats` | read | Request rates and — the real capacity — memory |

### The reindex pattern this app is built around

Typesense has **no create-or-update on a collection**: an existing name is a
409, and an existing field's type cannot be changed. So reshaping a collection
means building a new one and moving an alias:

1. `collection-create` a versioned collection — `products_v4`.
2. `document-import` everything into it.
3. `alias-upsert` — point `products` at `products_v4`.
4. `collection-delete` the old `products_v3`.

No search ever sees a gap. `alias-upsert` refuses to point at an **empty**
collection unless told to, because that leaves every search working and
returning nothing — which reads as a search problem rather than a deployment
one. `collection-delete` reports which aliases are about to start returning 404,
since an alias outlives the collection it names.

### Things the actions do that the API does not

- **`document-delete` does a dry run.** Typesense has no preview for
  delete-by-filter, and a filter that matches everything empties the collection
  and reports success with a count. So the action searches with the same filter
  first, reports the match count, and refuses past a threshold. It also notes
  that a search index reflects a source elsewhere — a full re-index brings
  deleted documents back unless the source changed too.
- **`document-upsert` is the safer write, and says so.** The single-document
  endpoint reports a rejection as an HTTP error; the bulk one buries it in a
  200. It also distinguishes **upsert** (replaces the whole document, so a
  partial payload deletes every field it does not carry) from **emplace**
  (upsert if new, merge if existing), which is what an incremental pipeline
  usually means.
- **`collection-get` reports what `query_by` will accept.** Three field
  properties decide what can be done and none is guessable from the data: type,
  `facet`, and `index` — a field with `index: false` is stored and invisible to
  search, which is exactly what a search returning nothing looks like. It also
  flags a schema with **no `.*` catch-all**, which is why an import that worked
  yesterday fails the day somebody adds a column upstream, and a collection with
  **no `default_sorting_field`**, which leaves equally-matching documents in an
  unspecified order — so a workflow taking `hits[0]` gets a different document
  run to run.
- **`multi-search` surfaces failures inside a 200.** Each result carries its own
  status, so one search can fail while the request succeeds — the same shape of
  trap as the import, and it is reported rather than left in the results array.
- **`key-list` flags unrestricted keys.** Only a **prefix** of each key comes
  back; the value is shown once at creation and never again, so this is for
  auditing what exists rather than recovering a lost key. "A search key in the
  front end" and "*the admin key* in the front end" look identical from outside,
  which is the reason for the flag.
- **`key-create` defaults to search-only and converts days to a timestamp.**
  Typesense wants absolute Unix seconds; sending a duration produces a key that
  expired in 1970 and a 401 that never mentions expiry. The value it returns
  exists nowhere else, and a test asserts it is never logged.
- **`node-stats` reports memory before request rates.** Typesense serves its
  index from RAM, so that is the capacity that runs out — and the failure is
  writes being refused while searches keep answering. It also notes that
  `stats.json` is a live **ten-second window**, not a counter, so totals derived
  from polling it are wrong.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Typesense Cloud's status — informational only |
| `node` | dependency | connection | **none** | Is this connection's own node healthy |
| `capacity` | quota | connection | signed | Memory and disk headroom |

### `node` — unauthenticated, and it says *why*

`GET /health` takes no key. That is unusual and valuable: most connection-scoped
checks have to be signed and therefore cannot separate "the server is down" from
"the credential was revoked". This one can.

Typesense also reports **`resource_error`** — `OUT_OF_DISK` or `OUT_OF_MEMORY` —
when a node is running short. Both are reported as `degraded` rather than
`down`, because a node out of memory **keeps answering searches and stops
accepting writes**: the index goes stale rather than the service going away.
That failure is quieter and arguably worse, and nothing else surfaces it.

### `capacity` — a quota check that is real

Most quota checks in this pack are declared absences, because the vendor
publishes no rate-limit header. Typesense publishes something better: the
resource that actually runs out. `/metrics.json` gives memory and disk, and this
warns *before* `/health` reports `OUT_OF_MEMORY` — by which point the index has
already stopped updating.

Unlike `/health`, this endpoint needs the key, so a rejected credential and an
outage look the same here. That is why it reports `unknown` rather than a
failure and defers to `node`.

### `service` — informational, deliberately

The feed covers **Typesense Cloud**. Typesense is mostly self-hosted, so
reporting it as fatal would mean a Cloud incident marking every self-hosted
connection unhealthy. A Management Console incident is also not the search path:
clusters keep serving while provisioning and the dashboard are affected, which
the check says.

## Icon

`assets/icon.png`, 620×620, downloaded verbatim from `typesense.org/favicon.png`
on 2026-08-19 (md5 `f84cc75e466092d009fcab65ba5f9663`). The vendor mark is a
lime glyph on a near-black plate, and on a dark tile the plate is 91% of the
image — so `assets/icon.dark.png` is the same file with the **plate made
transparent**, leaving the glyph. Both themes pass `_tools/icon-legibility.ts`.

## Tests

357 assertions across 21 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: the import action **parses the
per-document result** and fails a partial write by default, search **controls
both widening thresholds**, and the two destructive actions gate themselves.
