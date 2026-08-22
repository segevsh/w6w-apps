# Meilisearch

Search, index documents, and manage Meilisearch indexes and their settings.

- **Categories** — search, databases, developer-tools
- **Auth methods** — api-key
- **Actions** — 24
- **Egress allowlist** — `*` (self-hostable — see below)
- **Website** — https://www.meilisearch.com
- **API docs** — https://www.meilisearch.com/docs/reference/api/overview ·
  schema: `github.com/meilisearch/open-api` (`open-api.json`, engine v1.15.2)

## Setup

### API Key

1. **Instance URL** — your Meilisearch Cloud project URL, your own server, or
   `http://localhost:7700`. A URL without a scheme is assumed to be `https`,
   because an API key in flight deserves TLS; type `http://` explicitly if you
   mean it.
2. **API Key** — from Cloud's project settings, or your instance's master key.
3. **Default Index** — optional. Actions that take an index fall back to it.

### Which key, and why it matters more than usual

Meilisearch keys are **scoped**: the master key can do everything, while a key
made for searching can only search. Using a search-only key for a document write
fails with `403` and `code: "invalid_api_key"` — **the same code as a wrong
key** — so "the key is wrong" and "the key is not allowed to do that" look
identical from the outside.

The connection test allows for this: it probes `GET /keys`, and treats a `403`
there as success, because a key that authenticates but cannot list keys is a
scoped key doing exactly what it should. `key-list` is how you check a scope
when a write fails.

### Why the allowlist is `*`

There is no vendor host. The spec's `servers` block is `/`, because a
Meilisearch instance is wherever you run it. So the base URL is a connection
field and the app's egress allowlist has to be open — the same posture this pack
already uses for `mattermost`, `ghost`, `grafana`, `jenkins` and the other
self-hostable apps. It is deliberately wide, and it is the price of an app whose
server address only the operator knows.

## Actions

| Key | Type | Description |
|---|---|---|
| `search` | read | Search an index, with filters, sorting and facets |
| `multi-search` | read | Several searches across indexes in one request |
| `facet-search` | read | Search within a facet's values |
| `similar-documents` | read | "More like this" — needs an embedder |
| `document-add` | perform | Enqueue documents, replacing or merging |
| `document-list` | read | Read documents in index order, without searching |
| `document-get` | read | One document by primary key value |
| `document-delete` | perform | Delete by id, by ids, or by filter |
| `documents-clear` | perform | Empty an index, keeping its settings |
| `index-list` | read | Indexes and their primary keys |
| `index-get` | read | One index |
| `index-create` | perform | Create an index |
| `index-update` | perform | Set the primary key (empty indexes only) |
| `index-delete` | perform | Delete an index, its documents and its settings |
| `index-stats` | read | Document count and whether it is still indexing |
| `settings-get` | read | The whole settings object |
| `settings-update` | perform | Change settings; unset fields are left alone |
| `settings-reset` | perform | Reset **every** setting to its default |
| `task-get` | read | Whether an enqueued write actually succeeded |
| `task-list` | read | Recent tasks, optionally only the failed ones |
| `task-cancel` | perform | Cancel pending tasks matching a filter |
| `key-list` | read | API keys and their scopes |
| `stats-get` | read | Database size and per-index counts |
| `version-get` | read | The engine version this instance runs |

## Every write is a receipt, not a result

This is the one thing to know before wiring anything downstream. Adding
documents, changing settings, creating an index and deleting one **all** answer
immediately with:

```json
{ "taskUid": 12, "indexUid": "movies", "status": "enqueued",
  "type": "documentAdditionOrUpdate", "enqueuedAt": "2026-08-18T12:00:00Z" }
```

The work has not happened. Two consequences, both quiet:

- A workflow that adds a document and then searches for it **finds nothing**,
  and neither call errors.
- A task can **fail** — a malformed document, a filter naming an attribute that
  is not filterable — long after the write returned its `200`. Nothing in the
  write's response can tell you.

So every writing action returns the task verbatim, its output labels say the
status is *always* `enqueued` here, and a test asserts that every `perform`
action does so. `task-get` is the other half of the operation: it returns the
task plus two derived booleans, `finished` and `succeeded`, because "is it done"
and "did it work" are what a branch actually tests.

`index-stats` answers the looser version — `isIndexing` says whether the engine
is still working through this index's queue at all.

## Three more places the shape surprises

### Two paging contracts, and the wrong one loops forever

| Endpoints | Envelope | Paged by |
|---|---|---|
| `/indexes`, `/keys`, documents | `{results, offset, limit, total}` | `offset` |
| `/tasks`, `/batches` | `{results, total, limit, from, next}` | cursor (`next` → `from`) |

`offset` is not a parameter on `/tasks` and is **ignored rather than
rejected**, so an offset walk re-reads page one forever. The client has two
methods, the actions use the right one, and tests pin which is which.

### Add can mean replace or merge

`POST` **replaces** a document with the same primary key — fields you did not
send are gone. `PUT` **merges** into it — fields you did not send are kept.

Getting it backwards does not error; it silently drops half a document. So
`document-add` makes it a required choice, defaulted to the safer verb, rather
than shipping two similarly-named actions someone picks between by
autocomplete.

### The primary key is guessed once and then fixed

On an empty index Meilisearch infers the primary key from the first batch — an
attribute named `id`, or one ending in `Id`. The inference is permanent:
changing it afterwards means deleting the index and rebuilding it. Both
`index-create` and `document-add` offer it explicitly and say why, and
`index-update` exists for the narrow window while the index is still empty (the
task **fails** otherwise — which, being a task, is not an HTTP error).

## A spec defect worth recording

The document declares the search body's properties in **snake_case** —
`attributes_to_retrieve`, `hits_per_page`, `matching_strategy` — while declaring
the *same fields* as **camelCase** query parameters on the GET form of search
two paths away: `attributesToRetrieve`, `hitsPerPage`, `matchingStrategy`.

Both spellings cannot be what the engine accepts. The snake_case names are the
Rust struct fields the generator saw before serialization renamed them; the
camelCase ones are hand-written and match Meilisearch's own documentation. This
app sends camelCase, and a test asserts no action ever sends the other.

## Smaller sharp edges

- **A filter needs the attribute to be filterable first.** Filtering on an
  attribute missing from `filterableAttributes` fails with
  `invalid_search_filter` — it does not quietly return everything. Same for
  sorting and `sortableAttributes`. Both are settings, so both are changed by a
  task, so neither is instant.
- **`estimatedTotalHits` is an estimate.** Meilisearch stops counting once it
  has enough to answer. `search`'s **Count Every Match** switches to page-based
  pagination, where the field is an exact `totalHits` — and which is slower on a
  large index.
- **A filter is a string expression, not JSON.** `year < 2000` is the normal
  form; the array form is also accepted, so `document-delete` parses one that
  starts with `[` and passes anything else through as written.
- **Synonyms are one-directional.** `{"film": ["movie"]}` does not imply the
  reverse; list both ways to make them mutual.
- **Cancelling is itself a task**, so `task-cancel` returns a `taskUid` for the
  cancellation rather than for what was cancelled. Meilisearch refuses a cancel
  with no filter at all — but `statuses=enqueued` on its own reaches every
  pending write on the instance, across every index.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** server reachable? |
| `service` | service | Any open incident on Meilisearch **Cloud**? |

`instance` is the one that matters for a self-hosted app, and it is a different
question from "is the vendor up": the server is the operator's, and may be a
container on a laptop or a box behind a VPN that no status page has heard of.
Meilisearch publishes `GET /health` for exactly this, unauthenticated — read
unsigned here, so an expired key cannot make a healthy server look down.

`service` reads Meilisearch Cloud's incident feed, and two things shaped it:

- **It speaks only for Cloud.** It is scoped `component:cloud` rather than `*`,
  and marked informational, so a Cloud incident cannot make a self-hosted
  connection look broken.
- **The status page has no JSON API.** Verified 2026-08-18,
  `status.meilisearch.com` serves the same 1,084,319-byte HTML document for
  `/api/v2/status.json`, `/api/v2/summary.json` and `/history.atom` alike — a
  single-page app with a catch-all route, so every path "200s" and none of them
  is an endpoint. What *is* real is `/feed.rss`: `application/rss+xml`, titled
  "Incidents | Meilisearch Cloud". So this is a feed-backed check, and the host
  parses the RSS before the hook runs.

## What this app deliberately does not do

- **The thirty per-setting sub-paths.** `/settings/synonyms`,
  `/settings/stop-words` and the rest each have get/put/delete. Thirty
  near-identical actions would be a worse surface than one that matches how
  settings are actually reasoned about — as a single configuration for the
  index.
- **Dumps and snapshots.** Backup and restore is an operator task with real disk
  consequences, and triggering one from a workflow invites doing it on a
  schedule nobody is watching.
- **Key creation and deletion.** Minting a credential from inside a workflow is
  a different kind of act from using one. Keys are readable so a scope failure
  is diagnosable, and not writable.
- **Log streaming, experimental features and network topology** — operator
  surfaces.

## Errors

Meilisearch's envelope is `{message, code, type, link}`. `code` is the
machine-readable half — `index_not_found`, `invalid_search_filter`,
`invalid_api_key` — and `link` points at the documentation for it, so the whole
body is surfaced rather than a summary.
