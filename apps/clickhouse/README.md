# ClickHouse

Manage ClickHouse Cloud services — and run SQL against them, which is the point.

- **Categories** — databases, data-warehousing
- **Auth methods** — api-key, service
- **Actions** — 15
- **Egress allowlist** — `api.clickhouse.cloud`, `*.clickhouse.cloud`,
  `*.clickhouse.com`, `status.clickhouse.com`
- **Website** — https://clickhouse.com
- **API docs** — https://clickhouse.com/docs/cloud/manage/api/api-overview

Built against ClickHouse Cloud's own OpenAPI document (served live at
`api.clickhouse.cloud/v1`, 83 paths) and probed against `play.clickhouse.com` on
2026-08-19.

## Why ClickHouse, for the `databases` slug

The category RFC names Postgres, MySQL and MongoDB. **None of them can be an
HTTP app**: they speak binary wire protocols on their own ports, so a workflow
can manage them and cannot query them. `apps/mongodb-atlas` is a control plane
and says so in its first paragraph.

ClickHouse is the exception. Its **native interface is HTTP** — `POST /` with
SQL in the body — so this is the one app in the slug that can actually run a
query and hand back rows. The `index.ts` suite asserts the app has query, schema
*and* control-plane actions, so that property cannot quietly disappear.

## Two planes, two credentials

| Plane | Host | Credential | What it does |
| --- | --- | --- | --- |
| Control | `api.clickhouse.cloud` | organisation key id + secret | services, scaling, backups, billing |
| Query | the service's own host | database user + password | SQL |

A connection holds one or the other, and the actions say which they need. A
query action on an API-key connection explains that it is a control-plane
credential rather than failing with something about a missing host — and the
reverse.

## The HTTP status is derived from ClickHouse's error code, and misleads

Measured against `play.clickhouse.com`:

| SQL problem | ClickHouse code | HTTP |
| --- | --- | --- |
| `SELECT 1 +` | 62 `SYNTAX_ERROR` | **400** |
| unknown table | 60 `UNKNOWN_TABLE` | **404** |
| unknown column | 47 `UNKNOWN_IDENTIFIER` | **404** |
| forbidden statement | 497 `ACCESS_DENIED` | **403** |

So a **404 from a query is a typo in a table or column name**, not a wrong URL,
and a **403 means the SQL was refused**, not that the credential is bad. A client
with ordinary HTTP error handling — retry a 5xx, re-authenticate on a 403, report
a 404 as "not found" — draws the wrong conclusion from all three. This app reads
`X-ClickHouse-Exception-Code` and says which it is.

## The cost of a query comes back with the query

`X-ClickHouse-Summary` reports rows read, bytes read and memory used. Measured:

```
{"read_rows":"1","read_bytes":"1","result_rows":"0",
 "elapsed_ns":"899743","memory_usage":"1147327"}
```

On a columnar database, scanning a billion rows to answer a question is normal
and cheap. Scanning a billion rows to answer a question that should have touched
a thousand is the bug — and the *result* looks identical either way. So
`query-run` returns `rowsScanned` and a `scanRatio` with every query.

Every number in that header is a string, for the same reason a `UInt64` column
arrives as a string: 64 bits do not fit a double, and serialising it as a number
would lose precision. `query-run` returns each column's declared ClickHouse type
alongside the rows, because without it a caller cannot tell that string from a
real one.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `organization-list` | read | The organisation this key belongs to |
| `service-list` | search | Services, with what is running and what is billing |
| `service-get` | read | One service's state, endpoint and access list |
| `service-create` | perform | Provision one |
| `service-state` | perform | Start or stop |
| `service-scale` | perform | Where the bill is decided |
| `service-delete` | perform | Destroy it, and its backups |
| `ip-access-list-set` | perform | Who may connect at all |
| `backup-list` | read | What could be restored |
| `activity-list` | search | The control plane's audit trail |
| `usage-cost` | read | What it has cost |
| `query-run` | read | **Run SQL and get rows** |
| `query-insert` | perform | Insert rows |
| `table-list` | search | Tables, sizes and part counts |
| `table-describe` | read | Columns, and the sorting key |

### Things the actions do that the API does not

- **`query-run` is read-only by default, enforced by ClickHouse.** It sends
  `readonly=1` as a query setting, so the server refuses anything that writes.
  That is a real guarantee — it does not depend on this app parsing the
  statement, which is the part that always goes wrong. It also sends
  `max_result_rows` with `result_overflow_mode=throw`, so a limit that is hit is
  visible rather than silently truncating, and takes **named parameters**, so a
  value never has to be concatenated into SQL.
- **`query-insert` puts the rows in the body**, as `FORMAT JSONEachRow` — so
  values are never interpolated into a statement and the whole class of quoting
  problems does not arise. Only the table name reaches the SQL, and it is
  validated as an identifier. It also **warns on tiny batches**: every insert
  creates a part, and a workflow inserting single rows in a loop reaches
  `TOO_MANY_PARTS` and gets writes refused. `asyncInsert` with deduplication is
  the supported answer, and it is exposed rather than the problem being hidden.
- **`table-list` joins `system.parts`**, because the part count is the number
  that predicts a service refusing writes and it is not on `system.tables`.
  Nothing else in the API surfaces it.
- **`table-describe` returns the sorting key.** ClickHouse has no secondary
  indexes in the usual sense: the sorting key decides whether a filter reads a
  fraction of the table or all of it, and produces the same answer either way.
  That is the most important fact about a table and it is not in a column list.
- **`service-list` separates `idle` from `stopped`.** An idle service wakes on
  the next query; a stopped one does **not**, and keeps failing until something
  starts it. A failed query cannot tell them apart. It also counts services with
  idle scaling **off**, which bill around the clock — the most common avoidable
  cost here, and invisible because a busy service and an idle one look identical
  in a list.
- **`service-state` refuses to stop without an acknowledgement**, and points at
  `service-scale` — because "stop it to save money" is usually meant as idle
  scaling and gets an outage instead.
- **`service-delete` requires the service to be stopped first** (ClickHouse's
  own rule, restated rather than passed through as a 409) and **counts the
  backups**, because they are deleted with it. "We have backups" is not a
  recovery plan when the backups are part of what is being deleted.
- **`ip-access-list-set` names what it is about to remove.** The list replaces
  rather than merges, and an address dropped from it stops being able to connect
  *at all* — which presents as a timeout, not a permission error, so from a
  workflow it looks like the service being down.
- **`backup-list` does not offer to restore.** A ClickHouse Cloud restore
  provisions a **new service** rather than rewinding this one, so it is a
  migration with a cutover and new credentials — a decision, not a button.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is ClickHouse Cloud up |
| `quota` | quota | connection | none | Declared unavailable — the question is wrong |

### `service`

Reads `status.clickhouse.com`'s summary and separates the **control plane** from
the **services**: an API outage stops provisioning and stops nothing that is
already running, and a service outage is the other way round. A workflow that
only queries and one that only provisions are affected by different halves.

It never claims a full outage. ClickHouse Cloud incidents are usually scoped to
a region or a provider, and this check is app-scoped — it does not know which
region a given connection's service is in.

### `quota` — declared unavailable, because it is the wrong question

Neither plane publishes a rate-limit header. The query interface returns
`X-ClickHouse-Summary`, which is the **cost of the query just run**, not headroom
against anything.

And rates are not what constrains ClickHouse. A query exceeding
`max_memory_usage` is killed with `MEMORY_LIMIT_EXCEEDED`; concurrency is capped
by `max_concurrent_queries`; inserts outrunning merges end in `TOO_MANY_PARTS`
and a service that refuses writes. None of those is an account-level number.
`query-run` returns the per-query cost and `table-list` returns the per-table
part count, which are the honest versions of this question.

## Icon

`assets/icon.svg` is `clickhouse-logo-mark.svg`, taken verbatim from
ClickHouse's own documentation repository
(`github.com/ClickHouse/clickhouse-docs`, `static/img/`) on 2026-08-19 — the
mark alone, not the lockup. 586 bytes, md5 `2295974edba6c6dd7184e37f604635f5`.
It carries its own `prefers-color-scheme` rule, and passes
`_tools/icon-legibility.ts` in both themes unmodified.

## Tests

438 assertions across 22 files: one per action, one per auth method, one per
health check, both clients, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no dynamic imports,
no action touching a credential — plus three specific to this app: **the app
still has query, schema and control-plane actions** (the reason it was chosen),
**querying is still read-only by default**, and **nothing logs a generated
password, a SQL statement or result rows**, checked on the log call's values
rather than its keys.
