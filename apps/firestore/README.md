# Firestore

Read and write documents in a **Google Cloud Firestore** database over the
Firestore REST API. This is the NoSQL document database product — not Firebase
Realtime Database, which is a different product with a different wire format.

Every path, verb, query parameter, body field and enum here was verified on
**2026-09-22** against the Cloud Firestore discovery document the API serves from
its own host:

```
GET https://firestore.googleapis.com/$discovery/rest?version=v1
200 application/json; charset=UTF-8, 320,319 bytes, revision 20260911
```

`rootUrl` is `https://firestore.googleapis.com/`, `servicePath` is **empty**, and
every resource path is prefixed `v1/`. Human docs were used as context only
(`https://firebase.google.com/docs/firestore/reference/rest`); where the two
disagree, the discovery document wins.

## What it does

| Action | RPC | What it is for |
|---|---|---|
| `database-get` | `databases.get` | The database's metadata: type, edition, concurrency mode, location. |
| `document-get` | `documents.get` | One document by path, optionally projecting fields. |
| `document-create` | `documents.createDocument` | Create a document with a chosen or auto-generated id. |
| `document-update` | `documents.patch` | Patch the fields a mask names, or replace the whole document. |
| `document-delete` | `documents.delete` | Delete one document, with an existence precondition. |
| `document-list` | `documents.listDocuments` | One page of a collection, with an optional ordering. |
| `collection-list-ids` | `documents.listCollectionIds` | A document's subcollections, or the database's top-level ones. |
| `query-run` | `documents.runQuery` | Query a collection with filters, ordering and a limit. |
| `query-run-aggregation` | `documents.runAggregationQuery` | Count, sum or average without reading every document. |
| `documents-batch-get` | `documents.batchGet` | Many documents at once, told apart from the ones that do not exist. |
| `documents-batch-write` | `documents.batchWrite` | Many writes applied independently, each reporting its own status. |
| `documents-commit` | `documents.commit` | Many writes applied atomically, in order. |

`documents-commit` is the write to reach for when two documents have to agree;
`documents-batch-write` is the one when one failure should not sink the rest.

## Auth

One method: **OAuth 2.0**, the same Google flow this pack's other Google apps
use. Register an OAuth client in the Google Cloud Console (with the Cloud
Firestore API enabled on the project), store its `client_id`, `client_secret`
and `redirect_uri` on the w6w server, and users connect in the browser.

- **Scope:** `https://www.googleapis.com/auth/datastore` — the narrow scope from
  the discovery doc, purpose-built for Firestore, and sufficient for every RPC in
  this app (each method's `scopes` lists it). `cloud-platform`, the other scope
  the API accepts, grants every Google Cloud API and is deliberately not asked
  for.
- **Connection fields:** `projectId` (required) and `databaseId` (optional,
  `(default)`). Firestore has no "my project" shortcut — every path begins
  `projects/{projectId}/databases/{databaseId}/…` — so these are collected once
  on the Connection and can be overridden per action.
- **Auth probe:** `GET /v1/projects/{projectId}/databases/{databaseId}`
  (`databases.get`). It proves the token, the project and the database id in one
  request, needs no pre-existing collection, and returns only database metadata —
  never the credential. The verdict is read from the response **body's**
  `error.status`/`error.message`, never from the HTTP status alone: a `403
  PERMISSION_DENIED` means both "this token is bad" *and* "the Firestore API is
  not enabled on this project", and the message says so rather than guessing.
- **Google needs `access_type=offline` + `prompt=consent`** on the authorize URL
  to reliably hand back a refresh token.
- **Service accounts are not implemented.** Most production Firestore access is a
  service account signing a JWT assertion (RS256), which is a different auth
  shape. Shipping the OAuth path and saying so is better than half-implementing
  the other; a service-account mode is the natural follow-up.

## Documents and values

A Firestore document is `{name, fields, createTime, updateTime}`, and **every
leaf value is a typed-union object** — there is no bare-JSON shortcut:

```jsonc
{ "age":     { "integerValue": "36" },     // int64, spelled as a string
  "name":    { "stringValue": "Ada" },
  "score":   { "doubleValue": 1.5 },
  "active":  { "booleanValue": true },
  "at":      { "timestampValue": "2026-09-22T10:00:00Z" },
  "where":   { "geoPointValue": { "latitude": 51.5, "longitude": -0.1 } },
  "tags":    { "arrayValue": { "values": [ { "stringValue": "a" } ] } },
  "address": { "mapValue": { "fields": { "city": { "stringValue": "London" } } } },
  "null":    { "nullValue": null } }
```

Actions accept plain JSON and convert it (`lib/client.ts`): string → `stringValue`,
whole number → `integerValue` **as a string**, other number → `doubleValue`,
array → `arrayValue`, object → `mapValue`, `null` → `nullValue`. For what plain
JSON cannot express — a timestamp, a geopoint, base64 bytes, a document reference
or an int64 beyond 2^53 — pass an object with a single type key and it is taken
as already-typed:

```jsonc
{ "at":    { "timestampValue": "2026-09-22T10:00:00Z" },
  "where": { "geoPointValue": { "latitude": 51.5, "longitude": -0.1 } },
  "big":   { "integerValue": "9223372036854775807" } }
```

Reads return **both**: `fields` is the raw typed map, `data` is the same thing
decoded to plain JS. Three decode choices are deliberate and documented in
`lib/client.ts`: an `integerValue` becomes a JS number only when that is
lossless (otherwise the string survives), and `timestampValue` / `bytesValue` /
`referenceValue` stay the exact strings the API sent.

The one ambiguity is inherent to the wire format: a data object whose *only* key
is one of the type names (`{"stringValue": "x"}` as a map) is read as a typed
value. Wrap it explicitly to mean a map:
`{"mapValue": {"fields": {"stringValue": {"stringValue": "x"}}}}`.

## Paths and collections

Every path parameter is a **resource name**, not an id:

- database: `projects/{projectId}/databases/{databaseId}`
- documents root: `…/documents`
- a document: `…/documents/{collectionPath}/{documentId}`
- a collection's `parent` is `…/documents` (top level) or
  `…/documents/{parentDocumentPath}` (subcollection) — the collection id is a
  **separate** request field, never part of `parent`.

So a **collection path has an odd number of segments** (`users`,
`users/alice/orders`) and a **document path an even one** (`users/alice`). The
client enforces that rather than building a wrong URL: `document-get` with
`path: "users"` fails immediately with an explanation.

## The query surface

`query-run` and `query-run-aggregation` take a small, honest subset of
`StructuredQuery`, assembled into the wire shape in `lib/query.ts`:

- `from` — one `CollectionSelector` (`collectionId`; `allDescendants` turns it
  into a collection-group query),
- `where` — an `AND` of `{field, op, value}` filters, where `op` is one of
  `<`, `<=`, `>`, `>=`, `==`, `!=`, `array-contains`, `array-contains-any`,
  `in`, `not-in`, `is-null`, `is-nan`, `is-not-null`, `is-not-nan`
  (one filter is sent bare; two or more become a `CompositeFilter`),
- `orderBy` — `[{field, direction}]`,
- `limit` — a non-negative integer.

**Deliberately not exposed:** `OR` composites and arbitrarily nested filters,
`select` projections, cursors (`startAt` / `endAt`), `findNearest` vector search,
`offset`, `limitToLast`, and `explainOptions`. Each is either a different
workflow shape or would need its own vocabulary; a narrow surface that says what
it covers is more useful than a half-mirror of the full query DSL.

Note that `!=`, `not-in` and `array-contains-any` require their field to come
first in `orderBy` — that is Firestore's rule, and the API rejects the query
rather than silently reordering it.

`document-list`'s `orderBy` is different on purpose: that RPC documents a
**string** form (`priority desc, __name__ desc`), not an `Order[]` array.

## Health checks

- **`service`** (`kind: "service"`, `credential: "none"`, `severity` default
  `degraded`) reads the Google Cloud status feed
  `https://status.cloud.google.com/incidents.json`, which was verified on the
  wire on 2026-09-22: a JSON array of incidents carrying `service_name`,
  `affected_products[]` (each `{title, id, current_title}`), `status_impact`,
  `begin`, `end` and `external_desc`. The product list
  (`https://status.cloud.google.com/products.json`, 213 products) contains
  **`{"title": "Cloud Firestore", "id": "CETSkT92V21G6A1x28me"}`**. Open
  incidents (no `end`) that name Cloud Firestore in either `service_name` or
  `affected_products[]` decide the state; a broken dashboard is `unknown`, never
  `down`. `network.allow` is declared on the check itself, because
  `status.cloud.google.com` is not one of the API hosts the app's actions talk
  to. Firestore is a Cloud product, so this is the Cloud dashboard — not the
  Workspace one the `google-*` apps use, nor the Ads one.
- **`quota`** (`kind: "quota"`, `severity: "informational"`, `unavailable`) — a
  declared absence. Firestore publishes no headroom endpoint and no rate-limit
  response headers (verified against the v1 discovery document); its limits live
  in Google Cloud's quota system and are visible only in the Cloud console /
  Monitoring. Exhaustion surfaces as `429 RESOURCE_EXHAUSTED` or a `403` with
  reason `quotaExceeded`, which the client raises with Google's error envelope
  intact. An `unavailable` entry reports `unknown`, and `informational` never
  worsens a roll-up verdict.

## Out of scope

- **`listen`** — a long-lived server-streaming subscription, which does not fit a
  request/response action at all.
- **`partitionQuery`** and **`executePipeline`** — the first is for fanning a
  large query out across workers, the second is Firestore's newer pipeline API;
  neither is a document-level workflow step here.
- **Transactions** — `beginTransaction`, `rollback`, and `commit` against an open
  transaction. `documents-commit` covers the atomic-batch case without the
  stateful begin/rollback dance; a multi-step read-then-write transaction over
  REST is a follow-up (`documents-commit` does accept a `transaction` id for
  callers that obtain one elsewhere).
- **Field transforms** (`Write.transform` / `updateTransforms`: `increment`,
  `arrayUnion`, `maximum`, `serverTimestamp`) and `DocumentTransform`.
- **`bulkDeleteDocuments`** — a database-admin RPC that starts a long-running
  operation, and **`databases.exportDocuments` / `importDocuments`** with it.
- **Backups, PITR administration, CMEK, change streams, user credentials,
  indexes and field configuration, database create/delete/restore/clone** — all
  project/database-admin surface, not document workflow actions.
- **Firebase-specific surface**: Firebase Auth rules, the Firebase SDK, the
  Realtime Database, and `google.firestore.v1`'s Firebase extensions.
- **Service-account auth** — see Auth above.

## Files

```
package.json          the w6w manifest (id io.w6w.firestore)
deno.json / tsconfig.json
assets/icon.svg       the mark (see below)
assets/icon.dark.svg  the same artwork re-inked white for the dark tile
lib/client.ts         ctx.fetch wrapper, resource-name builders, Value <-> plain JS
lib/query.ts          the simplified StructuredQuery and Write builders
lib/params.ts         shared Param fragments
auth/oauth2.ts        OAuth 2.0 + the databases.get probe
actions/*.ts          one file per action
health/service.ts     Google Cloud status feed, filtered to Cloud Firestore
health/quota.ts       the declared absence of a quota endpoint
index.ts              wires it into an AppDefinition
tests/                unit tests with a mocked HookContext
```

## Icon provenance

Firebase has no separate Firestore mark, so this app uses **Firebase's**, from
[simple-icons](https://simpleicons.org/) (`firebase.svg`). `assets/icon.svg` is
that file **byte for byte** (1,927 bytes, `<title>Firebase</title>`) — it is
never reformatted, and `deno task fmt` does not touch `assets/`.

Because the mark paints with SVG's black initial value, it is legible on the
light tile and invisible on the dark one. `assets/icon.dark.svg` is the
sanctioned fix: the identical artwork with the root `fill` set to `#ffffff`, and
the manifest declares it under `appearance.darkMode.icon`.

## Development

```sh
deno task validate   # the pack conformance auditor (_tools/audit.ts)
deno task check      # type-check
deno task lint
deno task fmt        # never bare `deno fmt` — it would rewrite assets/icon.svg
deno task test
```

No runtime dependencies beyond `@w6w/types` (types-only, dev).
