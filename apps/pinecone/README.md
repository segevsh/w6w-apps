# Pinecone

Read and write a Pinecone vector index from a workflow — upsert records, search
by vector or by text, manage indexes and namespaces, and call Pinecone's hosted
embedding and reranking models.

- **Categories** — ai, databases, search
- **Auth methods** — api-key
- **Actions** — 24
- **Egress allowlist** — `api.pinecone.io`, `*.pinecone.io` (the data plane lives
  on a per-index host — see below)
- **Website** — https://www.pinecone.io
- **API docs** — https://docs.pinecone.io/reference/api ·
  schemas: [`pinecone-io/pinecone-api`](https://github.com/pinecone-io/pinecone-api)
  (`2026-04/db_control`, `db_data`, `inference`, fetched 2026-08-18)

## Setup

### API Key

1. app.pinecone.io → your **project** → **API keys** → create one. It starts
   with `pcsk_`.
2. Paste it in.

A Pinecone key is **scoped to one project**, and that is the whole permission
model. A key from another project connects perfectly and sees none of your
indexes — which is why the connection test reports *how many indexes the key can
see* rather than a bare "ok".

(Pinecone's Admin API, which manages projects and keys, authenticates with an
OAuth service account instead. Different credential, different job; not one a
workflow needs.)

### The two auth failures are plain text

Measured against `api.pinecone.io` 2026-08-18. Both answer `401` with
`content-type: text/html` and a body of a dozen-odd bytes:

| Body | Meaning |
|---|---|
| `Invalid API key` | Wrong, revoked, or from another organisation |
| `Missing api-key header` | The credential never arrived |

Every *other* Pinecone error is a JSON envelope
(`{"error":{"code","message"},"status"}`), so a client that assumes JSON reports
a parser error instead of the reason. This app reads the text first.

## Two planes, and only one has a fixed address

This is the thing to understand before anything else works:

| Plane | Host | What lives there |
|---|---|---|
| **Control** | `https://api.pinecone.io` | Indexes, backups, and the whole Inference API |
| **Data** | `https://{index_host}` | Upsert, query, fetch, list, update, delete, stats, namespaces |

The data plane's host is per-index — `product-embeddings-4xdf9s2.svc.aped-4627-b74a.pinecone.io`
— and Pinecone's own `db_data` spec declares its server as the variable
`https://{index_host}` because it cannot be named ahead of time. Only
`GET /indexes/{name}` knows it.

So every data action takes an **index name** and resolves the host through one
describe call, cached for the run: a loop over namespaces describes the index
once, not once per iteration. Each also accepts an explicit **Index Host** to
skip the lookup entirely, which is what a hot path should pass — `index-get`
returns it as `host`, and it never changes for the life of an index.

That is also why the egress allowlist needs `*.pinecone.io` and not just the API
host.

## The API version header is not optional

Pinecone versions its API by date, negotiated through `X-Pinecone-Api-Version`.
Measured 2026-08-18, **omitting it does not get you the latest — it gets you
`2024-04`**, the oldest version Pinecone still serves, echoed back in the
response's own header. An unsupported value answers `403` with the full list:

```json
{"error":{"code":"FORBIDDEN","message":"Unsupported API version '2099-01'.
 Supported versions: 2024-04, 2024-07, 2024-10, 2025-01, 2025-04, 2025-10,
 2026-04, 2026-07. Set the API version header to a supported version;
 the latest is 2026-07."},"status":403}
```

This app pins the version on **every** request, and pins it to **`2026-04`**
rather than to the newest the server names. `2026-07` exists, but the only spec
Pinecone publishes for it is `nexus_2026-07.oas.yaml` — a different product.
`2026-04` is the newest version with published `db_control`, `db_data` and
`inference` documents, which are the three this app was built against. A test
asserts the pin.

## Two naming conventions on one host

| Routes | Convention | Examples |
|---|---|---|
| `/query`, `/vectors/*`, `/describe_index_stats` | **camelCase** | `topK`, `includeMetadata`, `setMetadata`, `deleteAll` |
| `/records/*`, the whole control plane | **snake_case** | `top_k`, `rank_fields`, `field_map`, `deletion_protection` |

That is Pinecone's own history, not a typo here — the two were designed at
different times and both are current. Each action follows the convention of the
route it calls, and the tests assert the wire format either way.

## Text in, or vectors in

Two ways to build an index, and the choice decides which actions apply:

| | `index-create` | `index-create-for-model` |
|---|---|---|
| You supply | Vectors | Text |
| Write with | `record-upsert` | `record-upsert-text` |
| Search with | `record-query` | `record-search` (+ optional rerank) |
| Embedding model | Yours, anywhere | Pinecone's, **fixed permanently** |
| Dimension | You choose it, permanently | The model decides |

**The integrated version removes the two failure modes behind most vector-search
bugs**: embedding queries with a different model from the documents (which
returns confident nonsense, silently), and a dimension mismatch nobody notices
until the first upsert. It costs you the ability to change model without a full
re-ingest.

## Actions

| Key | Type | Description |
|---|---|---|
| `record-upsert` | perform | Write or replace records by id (≤1000, ≤2 MB) |
| `record-upsert-text` | perform | Write text into an integrated index (≤96) |
| `record-update` | perform | Change one record's values or metadata |
| `record-delete` | perform | By id, by filter, or empty a namespace |
| `record-query` | search | Similarity search by vector, or by record id |
| `record-search` | search | Semantic search by text, optionally reranked |
| `record-fetch` | read | Read records by id |
| `record-list` | read | Enumerate record ids by prefix |
| `index-stats` | read | Record counts per namespace |
| `embed` | perform | Pinecone's hosted embedding models |
| `rerank` | perform | Cross-encoder reranking of any documents |
| `model-list` | read | Available embedding and rerank models |
| `model-get` | read | One model's dimension and parameters |
| `index-list` | read | Every index in the project |
| `index-get` | read | One index — host, dimension, readiness, field map |
| `index-create` | perform | A serverless index you supply vectors to |
| `index-create-for-model` | perform | An integrated-embedding index |
| `index-configure` | perform | Deletion protection, tags, read/write params |
| `index-delete` | perform | Permanently delete an index |
| `namespace-list` | read | The namespaces in an index |
| `namespace-delete` | perform | Delete a namespace and everything in it |
| `backup-create` | perform | Point-in-time backup of an index |
| `backup-list` | read | Every backup in the project |
| `index-restore` | perform | Create a NEW index from a backup |

## Things worth knowing

### Upsert replaces; update merges

`record-upsert` is write-or-replace **by id** — a record that already exists is
overwritten whole, metadata included. That is what makes it safe to retry, and
it is also why sending values without metadata *erases* the metadata.
`record-update` is the partial write: `setMetadata` merges at the top level, so
unnamed keys survive. Neither can *remove* a metadata key — Pinecone has no
delete-field operation, so that needs a re-upsert.

### The batch limits differ by an order of magnitude

| Route | Limit |
|---|---|
| `record-upsert` | **1000 vectors or 2 MB**, whichever comes first |
| `record-upsert-text` | **96 records** — Pinecone embeds them for you |
| `record-delete` by id | 1000 ids |
| `record-query` | `topK` ≤ 10,000 |

The size ceiling is the one that bites: at 1536 dimensions with 2 KB of
metadata, roughly 245 records fit in 2 MB. Going over rejects the **whole**
request, not the excess, so this app checks the counts before sending and says
which limit was hit.

`record-upsert-text` is also the only route in Pinecone's API whose
`requestBody` declares **`application/x-ndjson`** and nothing else: the records
go one JSON object per line, and a JSON array is rejected.

### The empty namespace is a real namespace

Pinecone's default namespace is the empty string, and it is a namespace rather
than a wildcard: records written with no namespace are invisible to a query that
names one, and vice versa. Getting this wrong produces an index that looks empty
while holding everything.

Namespaces are the tenancy boundary — one per customer is the usual design, and
a query cannot leak across them by construction. The ceiling is plan-dependent:
100 namespaces per index on Starter, up to 100,000 on Standard and Enterprise.

### Created is not the same as ready

A new index comes back `status.state: "Initializing"`. It answers control-plane
calls in that state and **rejects data-plane ones**, so a workflow that creates
an index and immediately upserts into it will fail. `index-get` is how to wait,
and the `indexes` health check is how to notice.

### What each destructive action actually destroys

| Action | Removes | Survives |
|---|---|---|
| `record-delete` by id | Named records | Everything else |
| `record-delete` with Delete Everything | Every record in the namespace | The namespace itself |
| `namespace-delete` | The namespace and its records | The index |
| `index-delete` | The index, its records, its configuration | Nothing |

A confirmation flag is required for a filter delete, a delete-everything, a
namespace delete and an index delete — none of them can say in advance how much
they will remove, and none can be undone. Deleting a **named list of ids** needs
no confirmation: naming ids is itself the statement of intent, and re-deleting
them is harmless.

Pinecone's own guard is **deletion protection**: with it enabled, `index-delete`
is refused until `index-configure` turns it off. That two-step is deliberate and
this app does not collapse it.

### Backups restore into a new index

`index-restore` creates a **new** index from a backup and cannot overwrite the
original — the name must be free. Recovery is therefore always additive: stand
the old data up beside the damaged index and cut over. A backup can be restored
to a different region in the same cloud, but not to a different cloud, and both
backup and restore are asynchronous.

Pinecone's older **collections** are not here at all: they only work with
pod-based indexes, the legacy deployment model. Backups are the serverless
equivalent.

### Prefix your ids

`record-list` enumerates record *ids* and filters them only by prefix. Pinecone's
own guidance is to prefix ids by their parent document — `doc123#chunk1`,
`doc123#chunk2` — precisely so that one document's chunks can be listed and
deleted together. An index built with opaque UUIDs can do neither.

### `input_type` is not a detail

Most of Pinecone's embedding models are asymmetric: they embed a **passage** (a
document being stored) differently from a **query** (a question being asked).
Embedding a query as a passage returns a perfectly valid vector that retrieves
subtly worse results forever, with nothing to show that anything is wrong. It is
its own field on `embed` for that reason.

Similarly, `rerank`'s `rank_fields` defaults to `["text"]`: documents whose text
lives under any other key rerank against nothing and come back in an order that
looks arbitrary because it is.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Pinecone up — globally, or just in one region? |
| `indexes` | dependency | Are **this project's** indexes actually ready? |
| `quota` | quota | Declared absent — see below |

`service` reads Pinecone's Statuspage, which is **region-partitioned**: a
handful of global components (`Index Management`, `Inference`, `Console`,
`Assistant`) and a per-region grid under `Serverless Indexes` and `Pod Indexes`
— `AWS us-east-1`, `GCP europe-west4`, `Azure eastus2`, and so on. Rolling all
of that up would report an outage in `asia-northeast1-gcp` as an outage for a
customer whose only index is in `us-east-1`. So the **global** components decide
the verdict, and every region component is still reported but **capped at
`degraded`**, because this check is app-scoped and unsigned and cannot know
where your index lives.

`indexes` is the one that knows. It lists the project's indexes and reports each
one's `status.state` with its cloud and region — catching the gap between
"Pinecone is up" and "your index will answer a query": `Initializing` (degraded),
`InitializationFailed` (down, and permanent despite looking temporary),
`Terminating` (somebody deleted it). None of that appears on a status page.

`quota` is a **declared absence**, not an omission. Verified 2026-08-18:
responses carry no `x-ratelimit-*` headers of any kind — a limit breach is a bare
`429` — and `db_control`, `db_data` and `inference` publish no usage or balance
operation, so the monthly read/write unit consumption Starter and Builder are
metered against is visible only in the console. The Admin API that could report
it uses a different credential. Pinecone's published limits are also
per-namespace and per-index (100 rps each for query, upsert, delete and update
per namespace; 2,000 read units/second per index), so no single number would
describe a connection's headroom honestly.

## What this app deliberately does not do

- **Collections** — pod-only legacy; backups are the serverless replacement.
- **Pod-based and BYOC index creation** — sizing an index in pods and replicas is
  a capacity-and-price decision that belongs in a console.
- **Bulk imports from object storage** — they need a storage integration
  configured out of band, and belong to an ingest pipeline rather than a
  workflow step.
- **The Admin API** (projects, keys, service accounts) — a different credential.
- **Assistant and Nexus** — separate Pinecone products with their own specs.
