# Looker

Run Looks and inline queries against the modelled data, and inspect the models,
dashboards, users and schedules around them.

- **Categories** — analytics, data-warehousing
- **Auth methods** — api-credentials
- **Actions** — 11
- **Egress allowlist** — `*`
- **Website** — https://cloud.google.com/looker
- **API docs** — https://cloud.google.com/looker/docs/reference/looker-api/latest

Built against the Looker API **4.0** specification on 2026-08-19.

> **On the allowlist.** Every Looker deployment is its own host — Looker-hosted
> at `{name}.cloud.looker.com`, or self-hosted anywhere at all — so there is no
> list to name. Same shape as `apps/mastodon`, and it is what "your own
> instance" costs.

## Looker holds no data

This is the fact everything else follows from. Looker is a modelling layer: it
turns LookML into SQL and runs it against the customer's warehouse. So every
query action here is a query against **BigQuery, Snowflake, Redshift or
Postgres**, on somebody else's bill and at their latency, and nothing in the
response says what it cost.

Two consequences the actions encode rather than document:

- **Both query actions require a positive row limit.** Looker's `Query.limit` is
  a *string*, and its own specification says: "To download unlimited results, set
  the limit to -1 (negative one)." That is an unbounded scan of the whole
  Explore. `query-run` and `look-run` refuse `-1` and say why, before making any
  request.
- **A Look saved with no limit runs unbounded**, so `look-run` sends its own
  limit and overrides whatever the Look holds. `look-get` reports `unlimited` so
  you can see which Looks are like that.

`cache` is the other cost lever: left on, Looker may answer without touching the
warehouse at all. For a scheduled workflow that is the difference between one
query a day and one per run.

## `view` means Explore, and it is not the LookML view

Looker's spec documents `Query.view` as **"Explore Name"**. The interface says
Explore, the API field says view, and LookML has *views* that are a different
thing entirely. Somebody reading the LookML fills in the wrong one and gets a
404 for an Explore that does not exist.

`query-run` takes an `explore` parameter and maps it onto `view` itself;
`look-get` returns the Look's `query.view` as `explore`. A test asserts the
mapping, and `describeError` names the trap on any 404.

## Field names are always `view_name.field_name`

`orders.count`, never `count`. A bare name is rejected with a message naming the
field, which reads as though the field is missing rather than as though the
reference is malformed. `assertQualifiedFields` checks the form before sending,
so the error says what is actually wrong.

`explore-get` is where the valid names come from — and it splits **dimensions**
from **measures**, because selecting only measures returns one row and selecting
a dimension groups by it. A query that unexpectedly returns a single row has
usually selected no dimension, and nothing in Looker says so.

## There is no scope on a Looker API credential

A Looker API key is `client_id` + `client_secret` belonging to a **user**, and
it inherits that user's permissions entirely: which models their role allows,
which folders they can open, and which **rows** their user attributes filter
them down to.

That last one matters more than it looks. Looker's access filters restrict rows
per user, so the *same query* run through two connections legitimately returns
different data, with nothing indicating it. `me-get` is the action that answers
"why does this workflow see different numbers from the dashboard", and the
answer is usually the user.

Two operational notes on the credential:

- **`/login` takes both values as query parameters**, which is what Looker's own
  specification documents. The secret therefore appears in request logs at the
  instance. The token it returns lasts **one hour**, and the runtime refreshes
  it — so a 401 is more often a missed refresh than a revocation, and the errors
  say so.
- **A disabled user still authenticates.** Looker issues a token and refuses
  every query. `auth.test`, `me-get` and the `instance` health check all check
  for it, because nothing about that failure reads as a user problem.

## Self-hosted Looker is on port 19999

The API listens on 19999; the web interface is elsewhere. A URL that works in a
browser refuses the connection here, which presents as the instance being down.
`normalizeHost` appends the port for any host that is not `*.cloud.looker.com`,
so the connection form takes the URL people already know — and the auth test and
the health check both name the port when a connection fails, because it is the
commonest setup mistake in this app.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `me-get` | read | Who this credential is, and therefore what it can see |
| `model-list` | search | The LookML models and their Explores |
| `explore-get` | read | Every field an Explore exposes, dimensions and measures apart |
| `query-run` | read | Run an ad-hoc query against a model and Explore |
| `look-list` | search | Saved Looks, with the public ones counted |
| `look-get` | read | A Look's definition, without running it |
| `look-run` | read | Run a saved Look |
| `dashboard-list` | search | Dashboards, LookML and user-defined apart |
| `scheduled-plan-list` | search | What Looker sends on its own, and where |
| `user-list` | search | Who has access, and who can automate |
| `connection-list` | read | The warehouses every query actually lands on |

Everything reads. Looker has a write surface, and creating Looks, dashboards or
scheduled plans from a workflow means a workflow owning content an analyst is
meant to own — the wrong division of labour, and not what this app is for. An
`index.ts` test asserts no action is anything but a read or a search.

### Things the actions do that the API does not

- **`model-list` assembles `model/explore` pairs.** Those two names are what a
  query needs and neither is guessable — they are whatever the LookML author
  called them. It also names **models with no database connection**, which are
  defined, unusable, and produce a failure only at query time.
- **`look-run` returns the Look's `updated_at` with the rows.** A Look's
  definition lives in Looker and anyone with edit rights can change its fields,
  filters or model. A workflow reading `rows[0].total` depends on something it
  does not control and there is no version pinning, so the timestamp is the only
  signal there is.
- **`look-list` counts public Looks and warns.** A public Look has a URL that
  serves its results to anybody who has it, with no Looker account. Deliberate,
  and also business data on an unauthenticated address.
- **Soft deletion is handled everywhere it applies.** Looker keeps deleted Looks
  and dashboards with `deleted: true` — they are recoverable, genuinely unusual
  — and the list endpoints still return them. `look-list` and `dashboard-list`
  exclude them by default and report the count. `look-get` warns that a deleted
  Look **still answers a fetch**, so fetching one is not a test of whether it
  exists.
- **`scheduled-plan-list` withholds the addresses by default.** Each plan is a
  recurring warehouse query *and* a recurring data export — to email, S3, SFTP
  or a webhook — and its destination list is the only place a schedule still
  going to somebody who left the company is visible. That makes it a recipient
  list, so the types and counts come back and the addresses only on request.
  Nothing is ever logged.
- **`user-list` separates embed users from people.** `credentials_embed` marks a
  user created by signed embedding; they can vastly outnumber real users and are
  not licensed the same way, so counting them as staff makes every access review
  wrong. It also names who holds **API credentials**, which is the only record
  anywhere of which integrations exist.
- **`connection-list` reports the smallest connection pool.** `max_connections`
  is the real concurrency ceiling, and workflow queries share it with everybody
  using the interface — exhausting it makes Looker *queue*, which presents as
  everything being slow rather than as anything failing. It also names the
  connections where a query can trigger a **derived-table build**, a much larger
  operation than a SELECT.
- **`dashboard-list` separates LookML dashboards from user-defined ones.** They
  share a list, their ids differ (`model::name` versus a number), and only one
  kind is editable through the API.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable — there is no Looker to have a status |
| `instance` | dependency | connection | signed | Is *this* deployment reachable, and is the credential working |

### `service` — a different shape of absence

Most declared absences in this pack say *the vendor publishes nothing
machine-readable*. This one says **there is no shared service**. Every Looker
deployment is separate, hosted or not, so an incident on one says nothing about
another, and Google Cloud's status page reports the platform rather than any
tenant.

It would not be the whole question even if it existed. A healthy Looker in front
of a struggling warehouse presents to a workflow as a Looker failure — the query
hangs, and the error arrives through Looker. No status page anywhere covers that
pair.

### `instance`

Signed, because Looker offers no unauthenticated health endpoint. It therefore
cannot fully separate "the instance is down" from "the token expired" — so
instead of pretending, it says which a given failure looks like:

- **A connection failure names port 19999**, because on a self-hosted instance
  that is nearly always the cause and it looks exactly like an outage.
- **A non-JSON body** means the URL is reaching the web interface rather than
  the API — the same mistake, one layer further in.
- **A 401** is reported as a missed refresh before it is reported as a
  revocation, because the token's life is an hour.
- **A disabled user** is `down`, not `ok`: the instance answered, and every
  query that credential makes will be refused.

There is no `quota` check. Looker rate-limits per instance and publishes **no
rate-limit headers at all**, so there is nothing to read. The constraint that
actually binds a workflow is the database connection pool, and
`connection-list` reports it as `smallestPool`.

## Icon

`assets/icon.png`, 512×512, downloaded verbatim from
`https://www.gstatic.com/cloud/images/navigation/looker.png` on 2026-08-19 —
Google Cloud's own navigation asset (md5 `ce9e3221bd5a7b4adeee984935f0e029`).
A raster icon rather than an SVG, as in `apps/cal-com`; checked in both themes
with `_tools/icon-legibility.ts`.

## Tests

282 assertions across 16 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: **both query actions reject a
non-positive limit**, **`query-run` maps the Explore onto `view`**, and no
action logs a result row, a recipient address or an email.
