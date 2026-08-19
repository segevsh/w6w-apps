# NocoDB

Read and write records in bases and tables, follow links, and inspect schemas
and views.

- **Categories** — spreadsheets, databases
- **Auth methods** — api-token
- **Actions** — 13
- **Egress allowlist** — `*`
- **Website** — https://nocodb.com
- **API docs** — https://data-apis-v2.nocodb.com

Built against NocoDB's own OpenAPI schema (`swagger-v2.json`) and probed live
against `app.nocodb.com` on 2026-08-19.

> **On the allowlist.** NocoDB is open source and self-hosted as often as not;
> the cloud is one deployment of the same software. Same reasoning as
> `apps/typesense` and `apps/looker`.

## Sixty requests a minute, and it decides how to use this app

Measured on every response, authenticated or not:

```
x-ratelimit-limit: 60
x-ratelimit-remaining: 57
x-ratelimit-reset: 60
```

That budget is per caller and shared by every workflow on a connection, and it
is small enough to shape the design rather than sit in a footnote:

- **`record-list` defaults to a page of 200**, not NocoDB's 25. Walking a
  ten-thousand-row table at 25 a page is four hundred requests — six and a half
  minutes of doing nothing else.
- **`record-create` and `record-update` send an array in one request.** A
  thousand rows inserted one at a time is seventeen minutes of waiting on the
  rate limit; one array is a second.
- **`record-count` exists** so that "did the import land" is one request rather
  than a pagination loop.
- **`link-list` says when filtering the child table is cheaper**, because
  reading links is one request per record per field.
- The **`quota` health check reads the real remaining count** rather than
  guessing — and spends one of the sixty to do it, which is why it runs at most
  every two minutes.

## The filter syntax takes no spaces, and failing quietly is the problem

`(field,eq,value)~and(other,gt,3)`. NocoDB's documentation says not to put
spaces between the parts of a condition; what it does not say is what happens
when you do. The request **succeeds**, because the field name now ends in a
space and matches no column, and returns an empty list. A workflow reads "no
records matched" and carries on.

`assertWhere` refuses that before the request, along with a `where` that looks
like SQL. In `record-count` the trap is quieter still, because zero is a
perfectly plausible answer.

## Things worth knowing about the errors

- **The codes are stable.** `{"error":"ERR_TABLE_NOT_FOUND","message":"…"}` —
  `describeError` reads the code, so a reworded message does not break the
  handling.
- **A missing table is a 404 before the credential is checked.** Verified live:
  an unauthenticated request for a nonexistent table answers 404
  `ERR_TABLE_NOT_FOUND`, not 401. Useful in both directions — a "table not
  found" mid-run is always the table id and never the credential.
- **`xc-token` is the header that lasts.** `xc-auth` carries the session JWT
  the web interface uses; it expires, and a connection made with one stops
  working days later with a 401 that never mentions expiry.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `record-list` | search | Rows, filtered and sorted |
| `record-get` | read | One row by primary key |
| `record-count` | read | How many match, in one request |
| `record-create` | perform | Insert one row or many |
| `record-update` | perform | Change rows, ids in the body |
| `record-delete` | perform | Remove rows by id |
| `link-list` | read | The records on the other end of a link |
| `link-set` | perform | Connect or disconnect records |
| `base-list` | search | What this token reaches |
| `table-list` | read | Tables and the ids every action takes |
| `table-get` | read | The columns a write must satisfy |
| `view-list` | read | Saved filters, and which are public |
| `webhook-list` | read | What fires when this table changes |

### Things the actions do that the API does not

- **`record-list` says when a view is doing something to your filter.** With a
  `viewId`, NocoDB applies the conditions here **on top of** the view's own — so
  the result is the intersection rather than the rows the filter names.
- **`record-update` refuses a record with no primary key.** An update without an
  id is not an insert; NocoDB reports it as a missing field rather than as the
  rule it is. The action also honours a **different key column**, since a base
  built on an existing database uses whatever that database has, and names the
  fields explicitly set to `null` — because a PATCH leaves omitted fields alone,
  and clearing one means sending null.
- **`record-delete` takes ids and nothing else.** NocoDB deliberately offers no
  delete-by-filter here, which is a good constraint: a workflow removing
  "everything older than a year" has to list those rows and decide. It warns
  that a link from another table survives the deletion, pointing at nothing and
  rendering as an **empty cell rather than an error**.
- **`link-set` does the replace NocoDB does not have.** The API only adds and
  removes, so `mode: replace` reads the current links and reconciles — three
  requests against a sixty-a-minute budget, which is worth choosing rather than
  discovering. It also notes that on a many-to-one relationship, adding a second
  link *replaces* the first: the cardinality wins, quietly.
- **`link-list` explains an absence that looks like emptiness.** Linked records
  do not come back with the parent record; they live behind their own endpoint,
  keyed by the link field's **id** rather than its name. `table-get` is where
  that id comes from.
- **`table-get` separates writable columns from computed ones.** A formula or
  rollup is rejected in terms of the column rather than the rule. It also
  returns the values a select column will accept and the table's real primary
  key column.
- **`base-list` flags bases backed by an external database.** NocoDB presents
  existing Postgres or MySQL tables as spreadsheets, and the API is identical
  either way — but a `record-delete` against one of those deletes from the
  customer's production database, through its constraints and triggers. Nothing
  in a record response says which kind of base it came from.
- **`view-list` counts shared views**, which serve their rows to anybody with
  the link and no login.
- **`webhook-list` is the check to run before a bulk write.** Inserting a
  thousand rows fires a thousand webhooks, and whatever is on the other end
  receives all of them. Nothing in the data API mentions that writing a record
  will call somebody, and this is the single most common way an import becomes
  an incident.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable, twice over |
| `instance` | dependency | connection | **none** | Is this server healthy, and how long has it been up |
| `quota` | quota | connection | signed | How much of the minute's budget is left |

### `instance` — unauthenticated, and it reports uptime

`GET /api/v1/health` takes no credential and answers
`{"message":"OK","timestamp":…,"uptime":63296.5}`. So this reads the server
itself, and a revoked token cannot present as an outage.

The uptime is the interesting part. Most health endpoints say "fine"; this one
says how long the process has been running — and on a self-hosted NocoDB a
repeatedly small uptime is a container **crash-looping**. Every individual check
passes, and the pattern is the failure. A server up for under five minutes is
reported as `degraded` for that reason.

It is a v1 path deliberately: the data and metadata APIs are v2, and health
still answers on every version anybody is running.

### `quota` — a real number

Unlike most quota checks in this pack, this one reads a published, current
figure. It costs one request from the budget it measures, which is the honest
trade and the reason for the two-minute floor. An instance behind a proxy that
strips the headers reports `unknown` rather than a failure.

### `service` — a declared absence, twice over

`status.nocodb.com` serves an HTML uptime page; `/api/v2/summary.json`,
`/api/v1/monitors` and `/badge` all return 404. And it would speak only for
`app.nocodb.com`, which is one deployment of software most people run
themselves — the same shape of absence as `apps/mastodon`.

## Icon

`assets/icon.svg`, downloaded verbatim from NocoDB's own repository
(`packages/nc-gui/assets/img/brand/nocodb-logo.svg`) on 2026-08-19, md5
`b23a06182601d4d4471b15464a4345c1`. Checked in both themes with
`_tools/icon-legibility.ts`.

## Tests

271 assertions across 18 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: both filtering actions **validate the
`where` before sending**, both write actions **send an array in one request**,
and deleting requires a confirmation.
