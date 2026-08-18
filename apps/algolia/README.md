# Algolia

Search Algolia indices and keep their records, settings, synonyms and rules in
sync.

- **Categories** — search, developer-tools
- **Auth methods** — api-key
- **Actions** — 22
- **Egress allowlist** — `*.algolia.net`, `*.algolianet.com`
- **Website** — https://www.algolia.com
- **API docs** — https://www.algolia.com/doc/rest-api/search/ ·
  schema: https://github.com/algolia/api-clients-automation (`specs/bundled/search.yml`)

## Setup

### Application ID & API Key

1. In Algolia, go to **Settings → API Keys**.
2. Copy the **Application ID** and an **API key**.

Algolia authenticates with **two** headers rather than one —
`x-algolia-application-id` and `x-algolia-api-key` — which is why this auth
method is `custom`.

The application ID is **not a secret**: it is part of the API hostname
(`{appId}.algolia.net`) and Algolia embeds it in front-end code, so it is a
plain field. It is also what actions build their URL from, so `afterConnect`
publishes it to the connection's display along with the key's ACLs.

**Keys are ACL-scoped.** An Algolia key carries a list like `search`, `browse`,
`addObject`, `deleteObject`, `settings`, `editSettings`, `listIndexes`, `logs` —
and the spec records the required ACL on every operation, which each action's
doc comment repeats. A search-only key will 403 on any write. That is why the
liveness probe is `GET /1/keys/{key}`, which describes the key being used and
needs no ACL of its own: probing an index list instead would need `listIndexes`
and would report a perfectly good search key as broken.

## Actions

| Key | Type | Description | ACL |
|---|---|---|---|
| `search` | search | Search one index | `search` |
| `search-multi` | search | Several queries across one or many indices | `search` |
| `browse` | read | Walk every record in an index, page by page | `browse` |
| `object-get` | read | Get one record by objectID | `search` |
| `object-save` | perform | Create or fully replace a record | `addObject` |
| `object-add` | perform | Add a record, letting Algolia mint the ID | `addObject` |
| `object-update` | perform | Change some attributes of a record | `addObject` |
| `object-delete` | perform | Delete one record | `deleteObject` |
| `objects-batch` | perform | Add, update or delete many records at once | `addObject` |
| `objects-delete-by` | perform | Delete every record matching a filter | `deleteIndex` |
| `index-list` | read | List indices with record counts and sizes | `listIndexes` |
| `index-clear` | perform | Empty an index, keeping its configuration | `deleteIndex` |
| `index-delete` | perform | Delete an index and its configuration | `deleteIndex` |
| `index-operation` | perform | Copy or atomically move an index | `addObject` |
| `settings-get` | read | Read an index's settings | `settings` |
| `settings-set` | perform | Update an index's settings | `editSettings` |
| `synonym-save` | perform | Create or replace a synonym | `editSettings` |
| `synonym-search` | search | List or search synonyms | `settings` |
| `rule-save` | perform | Create or replace a query rule | `editSettings` |
| `rule-search` | search | List or search query rules | `settings` |
| `task-get` | read | Check whether an async write has published | — |
| `log-list` | read | Read the application's recent API calls | `logs` |

### A third of the spec's paths are not endpoints

Algolia's OpenAPI document describes both its REST API *and* the methods its
generated client libraries expose. Everything outside the `/1/` prefix —
`/saveObjects`, `/browseObjects`, `/replaceAllObjects`, `/waitForTask`,
`/chunkedBatch`, `/generateSecuredApiKey` and the rest — is flagged
**`x-helper: true`**: those are SDK conveniences, not HTTP routes. The
giveaway is that `saveObjects` is declared `GET`.

An app built by pointing a generator at that document would emit calls to URLs
Algolia does not serve. Every action here uses a real `/1/` endpoint, and a test
asserts it by extracting each action's request path and rejecting both
non-`/1/` paths and the known helper names.

### Reads and writes go to different hosts

The document's `servers` are `https://{appId}.algolia.net`,
`https://{appId}-dsn.algolia.net` and three `{appId}-N.algolianet.com`
fallbacks — per-application hostnames, which is why the egress allowlist is
`*.algolia.net` + `*.algolianet.com` rather than a fixed host.

Algolia's own clients read through the **DSN** host, which is geo-replicated,
and write to the **primary**. The spec marks reads `x-use-read-transporter`, and
this app honours the split; a test asserts that only `read`/`search` actions use
the read transporter.

What this app deliberately does **not** implement is Algolia's retry strategy:
an SDK falls back across the `algolianet.com` hosts when the primary is
unreachable. An action is a single request, so a failure surfaces as a failure
rather than being silently retried elsewhere.

One cosmetic consequence worth knowing: application IDs are uppercase, and
building a request through `URL` lowercases the host, so `APPID.algolia.net`
goes on the wire as `appid.algolia.net`. That is the WHATWG URL spec's host
normalisation, it reaches the same server because DNS is case-insensitive, and
the ID is still sent verbatim in the header Algolia actually authenticates
against. A test pins this so nobody later "fixes" it.

### Every write is asynchronous

This is the single most common surprise with this API. A write returns
immediately with a `taskID`, and the change is **not searchable until that task
is published**. A workflow that writes and then searches without waiting will
miss its own write.

`task-get` reports a task's status (`notPublished` / `published`). It reports
once rather than blocking — an action that waited would hold a step open for an
unbounded time — so a workflow polls it or sleeps between steps.

### Search, browse, and the 1,000-hit ceiling

`search` returns at most **1,000 hits in total**, however you page it. `browse`
is the one that walks a whole index, with a `cursor`, and is what an export or
re-index uses; it also ignores some ranking parameters by design.

`browse` returns **one page plus its cursor** rather than looping to exhaustion:
a full index can be millions of records, and materialising that into a single
step's output would be the wrong shape. Feed the cursor back in to continue.

### Deleting by filter is not deleting by query

`objects-delete-by` maps to `deleteByQuery`, whose body — verified in the schema
— has **no `query` property at all**. Algolia deletes by `filters`,
`facetFilters`, `numericFilters`, `tagFilters` and the geo ones, deliberately,
because deleting by a fuzzy full-text match would be dangerous. Passing a search
string would do nothing, so this action does not offer one, and it refuses to
send an empty filter set rather than issuing a meaningless call.

Note also its ACL: `deleteIndex`, not `deleteObject`. A key that can delete
records one at a time may still be refused here.

### Zero-downtime re-indexing

`index-operation` with `move` is the atomic swap: build `products_tmp`, then
move it onto `products` in one step, so searchers never see an empty index.
`copy` with a `scope` of `settings,synonyms,rules` clones configuration without
records. Scope applies to a copy only — passing it with a move is refused here
rather than silently ignored by Algolia.

`settings-set` and the synonym/rule writes take `forwardToReplicas`. Without it,
a change lands on the primary index only and replicas keep serving the old
configuration.

### Two actions declare no `output` fields

`object-get` returns the caller's own record and `settings-get` returns an index
configuration whose keys are Algolia's evolving surface — neither has a fixed
field list this app could honestly declare. The auditor's two warnings are the
accurate signal.

### Deliberately out of scope

- **API key management** (`/1/keys` writes). Creating a key returns a live
  credential that would land in step output and run logs — the same reasoning
  the `resend` app applies. The auth `test` hook reads `GET /1/keys/{key}` for
  the connected key's own ACLs, which is safe.
- **Secured API key generation** — an SDK-side HMAC helper, not an endpoint.
- **Clusters and user-ID mapping** (`/1/clusters/*`) — multi-cluster tenant
  routing, an infrastructure concern with its own vocabulary.
- **Dictionaries**, **security sources**, and the `/{path}` custom-request
  escape hatch.

## Health check

Three questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Algolia's own status API — and the Statuspage-looking paths are decoys.**
`status.algolia.com` presents like an Atlassian Statuspage and is not one.
Verified 2026-08-18:

```
GET https://status.algolia.com/api/v2/status.json   -> 200, 559 B, HTML (same md5)
GET https://status.algolia.com/api/v2/summary.json  -> 200, 559 B, HTML (same md5)
GET https://status.algolia.com/1/status             -> 200, ~7 KB, JSON
    {"status":{"c1-br":"operational","c1-ca":"operational", … }}   (298 clusters)
GET https://status.algolia.com/1/incidents          -> 200, JSON
    {"incidents":{"c23-usw":[{"t":…,"v":{"title":…,"status":"major_outage"}}]}}
```

The two conventional paths return the **identical** HTML document — the page's
own SPA shell — so a probe built on the usual convention would parse markup and
report nothing. What Algolia publishes instead is per-cluster JSON one level up,
and `/1/status` is the current state, which is what "is it up" means.
`/1/incidents` is a history log answering a different question.

The status vocabulary is taken from live data rather than guessed —
`operational` and `major_outage` are both observed — so an unrecognised value
degrades and carries its raw text into the message rather than being treated as
fine.

**Per-cluster, rolled up.** Algolia runs hundreds of clusters and a connection
sits on one, which this app cannot know from the application ID alone. So the
check reports the fleet: all operational is `ok`, and anything else names the
affected clusters (capped at five, then summarised). That is honest about what
is knowable — a regional incident is real news even when it may not be yours.

### Is this credential live?

`GET /1/keys/{key}` — it describes the key being used, needs no ACL of its own,
and returns the ACLs that key actually holds. 401/403 and 404 get different
messages: a rejected credential and a key that belongs to a different
application are different fixes.

### Do we have quota left?

**Declared unavailable.** Algolia meters records and operations against a
**monthly plan quota** shown on the dashboard, and publishes no API that returns
remaining headroom for the calling application. Its OpenAPI document declares no
response headers and no `429` on any of its 60 paths (verified 2026-08-18), and
`x-ratelimit` appears nowhere in it. `GET /1/keys/{key}` exposes a key's own
ceilings (`maxQueriesPerIPPerHour`, `maxHitsPerQuery`) but not consumption
against them — a limit, not a balance.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET status.algolia.com/1/status` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — plan quota is dashboard-only |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` method's `test` hook |

## Icon

`assets/icon.svg` — the Algolia mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/algolia.svg>, downloaded
2026-08-18.

- **804 bytes**, md5 `32fee19c6e54549f086c61661b4ca85b`,
  `<title>Algolia</title>`, `viewBox="0 0 24 24"`
- inked with `#003DFF`, the hex simple-icons records for this brand (sourced
  from Algolia's own style guide)
- **no dark variant needed**: the blue clears `_tools/icon-legibility.ts` on both
  the light and dark tiles
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Algolia's own OpenAPI
document (the `algolia/api-clients-automation` monorepo, "Search API" v1.0.0, 60
paths — confirmed via the GitHub API to be Algolia's org repo and not a fork),
plus live probes of `status.algolia.com`. Status surfaces move; re-check if a
probe starts failing for everyone at once.
