# Coda

Read and write Coda docs, tables and rows via the Coda REST API.

- **Categories** — productivity, documents
- **Auth methods** — api-token
- **Actions** — 11
- **Egress allowlist** — `coda.io`
- **Website** — https://coda.io
- **API docs** — https://coda.io/developers/apis/v1

> Coda's product is being rebranded "Superhuman Docs" (coda.io now banners "Coda is now
> Superhuman Docs"), but the API host, auth model and endpoints are unchanged at
> `coda.io/apis/v1` as of this writing. This app keeps the `Coda` name per its spec; revisit
> if the API host itself moves.

## Actions

| Key | Type | Resource | Endpoint |
|---|---|---|---|
| `list-docs` | read | doc | `GET /docs` |
| `get-doc` | read | doc | `GET /docs/{docId}` |
| `list-tables` | read | table | `GET /docs/{docId}/tables` |
| `list-columns` | read | column | `GET /docs/{docId}/tables/{tableId}/columns` |
| `list-rows` | read | row | `GET /docs/{docId}/tables/{tableId}/rows` |
| `get-row` | read | row | `GET /docs/{docId}/tables/{tableId}/rows/{rowId}` |
| `upsert-rows` | perform | row | `POST /docs/{docId}/tables/{tableId}/rows` |
| `update-row` | perform | row | `PUT /docs/{docId}/tables/{tableId}/rows/{rowId}` |
| `delete-row` | perform | row | `DELETE /docs/{docId}/tables/{tableId}/rows/{rowId}` |
| `delete-rows` | perform | row | `DELETE /docs/{docId}/tables/{tableId}/rows` |
| `get-mutation-status` | read | mutation | `GET /mutationStatus/{requestId}` |

### Row writes are async

`upsert-rows`, `update-row`, `delete-row` and `delete-rows` all answer **HTTP 202** with a
`requestId` — the edit is queued, not yet applied. `get-mutation-status` polls
`GET /mutationStatus/{requestId}` so a workflow can wait for a write to actually land before
reading the row back. `upsert-rows` is **not** marked idempotent: without `keyColumns` every
call inserts new rows, so retrying duplicates them. With `keyColumns` set it behaves as an
upsert. `update-row`, `delete-row` and `delete-rows` are idempotent — reapplying the same
cell values, or deleting an already-gone row, converges on the same end state.

## Auth

**API Token** (`bearer`) — a single token generated at coda.io/account under API Settings,
sent as `Authorization: Bearer <token>`. No OAuth flow; the credential is the whole story.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.coda.io>, an Atlassian Statuspage-powered page with a
machine-readable Atom feed at `https://status.coda.io/history.atom`. Declared via `feed`
rather than hand-parsed: the host fetches and parses it, this app only interprets entries
(Statuspage prefixes each update with its status word — `Resolved`, `Investigating`,
`Monitoring` — so an incident whose newest entry doesn't start with "Resolved" is still open).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The `api-token` auth method probes:

```
GET /whoami
```

The documented way to verify a token; resolves the acting account without needing any doc
or table permissions.

### Do we have quota left?

No headroom endpoint. Coda documents numeric thresholds (100 reads/6s, 10 writes/6s, 4
doc-listings/6s) but no response headers naming remaining quota — exhaustion surfaces only
as a plain HTTP 429.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `feed`: `status.coda.io/history.atom` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

**`quota` is declared absent.** Coda publishes numeric rate limits but no headroom endpoint
or rate-limit response headers. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at
`unknown` forever.

---

Researched and endpoint-verified 2026-08-01 against `coda.io/developers/apis/v1`,
`coda.io/apis/v1/openapi.yaml` and `status.coda.io`, cross-checked against n8n's
production Coda node. Status surfaces move; re-check with `_tools/audit.ts` conventions
in mind if a probe starts failing for everyone at once.
