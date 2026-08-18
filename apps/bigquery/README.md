# BigQuery

Run BigQuery SQL, stream rows in, and manage datasets, tables and jobs.

- **Categories** — data-warehousing, databases
- **Auth methods** — oauth2
- **Actions** — 18
- **Egress allowlist** — `bigquery.googleapis.com`
- **Website** — https://cloud.google.com/bigquery
- **API docs** — https://cloud.google.com/bigquery/docs/reference/rest ·
  schema: `https://bigquery.googleapis.com/$discovery/rest?version=v2`
  (a discovery document served by the API's own host)

## Setup

### OAuth (Sign in with Google)

1. In Google Cloud, pick or create a project and **enable the BigQuery API**
   for it.
2. Configure OAuth client credentials for this w6w installation (the client id
   and secret are installation-level, not per-connection).
3. Connect, and set **Project ID** to the Cloud project you want to run in.
   This is the project that gets **billed** — it need not be the project that
   owns the data, since a query can read a public or shared dataset while the
   cost lands on yours.
4. **Default Dataset** is optional. Actions that take a dataset fall back to
   it, so setting it once saves passing it on every action.

The connection asks for exactly one scope, `.../auth/bigquery`. The discovery
document lists seven; `cloud-platform` grants every Google Cloud API and the
three `devstorage.*` scopes exist for load and export jobs that move data
through Cloud Storage, which this app does not do.

> **Service accounts are not this auth method.** Most production BigQuery
> access is a service account presenting a signed JWT assertion, which is a
> different auth shape (RS256 signing, no interactive consent). This app ships
> the OAuth path and says so rather than half-implementing the other.

`access_type=offline` and `prompt=consent` are set on the authorize URL because
without them Google does not reliably return a refresh token — and a connection
with no refresh token dies in an hour, which stops every scheduled run.

## Actions

| Key | Type | Description |
|---|---|---|
| `query-run` | perform | Run SQL and get the rows back, or price it with a dry run |
| `query-results-get` | read | Fetch (or page through) a completed query job's rows |
| `rows-list` | read | Read a table's rows directly — no query, no bytes billed |
| `rows-insert` | perform | Stream rows into a table |
| `job-insert` | perform | Start any job: query, load, extract or copy |
| `job-get` | read | Get a job's state, errors and statistics |
| `job-list` | read | List jobs in a project |
| `job-cancel` | perform | Ask BigQuery to stop a running job |
| `dataset-list` | read | List a project's datasets |
| `dataset-get` | read | Get a dataset's settings, location and access list |
| `dataset-create` | perform | Create a dataset |
| `dataset-delete` | perform | Delete a dataset, optionally with its tables |
| `table-list` | read | List a dataset's tables and views |
| `table-get` | read | Get a table's schema, size and partitioning |
| `table-create` | perform | Create a table, optionally partitioned and clustered |
| `table-update` | perform | Change a table's description, expiry or schema |
| `table-delete` | perform | Delete a table and its data |
| `project-list` | read | List the projects this connection can use BigQuery in |

## Three ways BigQuery is silently wrong, and what this app does

Each of these produces a *plausible* result rather than an error, which is what
makes them worth handling in the app rather than leaving to the workflow author.

### 1. Rows are positional, not named

A query does not return `[{name: "ada", age: 36}]`. It returns a schema
alongside rows shaped like `{f: [{v: "ada"}, {v: "36"}]}` — positional cells,
every scalar a **string**, `null` for NULL, a nested `{f: […]}` for a RECORD,
and an array of `{v: …}` for a REPEATED field. A workflow that reads
`row.f[0].v` works until someone adds a column in front of it.

`query-run`, `query-results-get` and `rows-list` therefore return a decoded
`rows` array **and** the raw form, so the mapping is done once, in one place.

Values are deliberately **not** coerced. BigQuery returns INT64 as a string
precisely because it does not fit a JSON number; turning it into one would
silently lose precision on large ids.

`rows-list` needs the schema to decode, and the data endpoint does not return
one — so it fetches the table too. That is one extra request, and the reason it
is worth it is above.

### 2. A query can "succeed" without finishing

`timeoutMs` bounds how long BigQuery waits before replying, **not** how long
the query runs. A response with `jobComplete: false` is a normal, successful
HTTP 200 that carries no rows — the results are collected later with
`query-results-get` and the job reference.

The same trap sits on jobs: `status.state: "DONE"` means *finished*, not
*succeeded*. A failed job is DONE with `status.errorResult` set, so `job-get`'s
output labels say exactly that.

Jobs are also **regional**. A job created in `EU` is not visible to a lookup
that omits the location, and the failure is a `404` that reads like the job
never existed — so `job-get`, `job-cancel` and `query-results-get` all take an
optional location.

### 3. Streaming inserts fail partially with a 200

`insertAll` answers HTTP 200 even when it rejected rows: the rejections are in
`insertErrors[]`, keyed by row index. A caller that only checks for an
exception silently drops data. `rows-insert` counts what actually landed and
returns both `insertedRows` and `insertErrors`.

Streaming is also **not idempotent** unless you make it so. Both writes that
can duplicate on a retry declare `idempotent: false` and offer the fix rather
than pretending: `rows-insert` can derive a stable per-row `insertId` from the
step's invocation id (BigQuery's own de-duplication key), and `job-insert` can
derive a job id the same way, so a retry re-attaches to the job already running
instead of starting a second one.

## What this app deliberately does not do

- **Upload or download bytes.** Load and extract jobs are startable through
  `job-insert`, but the resumable-upload and Cloud Storage paths are a
  different host and a different scope; keeping them out is what lets the
  allowlist stay at a single host.
- **Manage IAM.** Dataset access entries are readable and settable as part of a
  dataset; project-level IAM is a different API.
- **Track the "latest" anything.** The discovery document is versioned at `v2`
  in the path, and every response shape declared here was read from the
  document fetched 2026-08-18.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is BigQuery itself up, per the Google **Cloud** status dashboard? |
| `quota` | quota | Declared unavailable — see below |

Picking the right status surface matters: this pack's `google-analytics` app
sits on the *advertising* dashboard and the Workspace apps use
`www.google.com/appsstatus`. BigQuery is on neither — it is a Cloud product.
Verified 2026-08-18, `status.cloud.google.com/products.json` returns 212
products including `{"title":"Google BigQuery"}` **and** a separate "BigQuery
Data Transfer Service", so only the former is matched; a multi-product outage
is caught through `affected_products[]` as well as `service_name`.

`quota` is a **declared absence**, and the interesting part is that half the
question *is* answerable. Every query response carries `totalBytesProcessed`,
and `query-run` with **Dry Run** on returns that estimate without running the
query or being billed — that is how a workflow avoids a surprise. What BigQuery
does not publish through this API is *headroom*: concurrent-query and daily-byte
limits live in Cloud's quota system and would need a different API and a wider
scope to read. Exhaustion surfaces as a `403` whose `reason` is `quotaExceeded`
or `rateLimitExceeded`, which the client raises with Google's envelope intact.

## Errors

Google's error envelope is `{"error": {"code", "message", "errors": [{"reason"}]}}`.
The `reason` is the machine-readable part — `notFound`, `accessDenied`,
`quotaExceeded`, `invalidQuery` — and the `message` carries the SQL error text,
so failures surface the status and the whole envelope rather than a summary.
