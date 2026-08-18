# Fivetran

Run the pipelines that fill a warehouse — trigger and watch connection syncs,
pause and resume them, run the dbt transformations that turn raw rows into
models, and read the destinations behind it all.

- **Categories** — data-warehousing, devops, analytics
- **Auth methods** — api-key
- **Actions** — 20
- **Egress allowlist** — `api.fivetran.com` (the `service` health check adds
  `status.fivetran.com`)
- **Website** — https://www.fivetran.com
- **API docs** — https://fivetran.com/docs/rest-api ·
  spec: `open-api-spec.json` in `github.com/fivetran/terraform-provider-fivetran`
  (99 paths)

Every path this app calls was checked against that document on 2026-08-18 and
probed live: `/v1/groups` answers `401` where `/v1/nope` answers `404`, so the
401s prove the routes.

Together with this pack's **dbt Cloud** app it covers both halves of the modern
data stack — Fivetran loads the warehouse, dbt transforms it — and Fivetran can
run dbt itself, which is what `transformation-run` does.

## Setup

### API key and secret

Fivetran → Account Settings → **API Config**. Sent as HTTP Basic: the key as the
username, the secret as the password.

**Three kinds of key exist and authenticate identically.** A **scoped key** is
tied to a person and carries their access — it stops working when they change
team. A **service account key** is for programmatic use, and is the right choice
here. **System keys** are org-level. Nothing about a request says which you
have, so a workflow can be built on a key that quietly expires with somebody's
role change.

### A trial account is forty times tighter

| | Trial | Paid |
|---|---|---|
| All requests | **500/hour** | **20,000/hour** |
| Setup tests | 50/hour | 250/min, 2,500/hour |
| Source interaction | 25/min, 250/hour | 500/min, 5,000/hour |

A workflow that runs comfortably against a paid account will not survive being
pointed at a trial. The connection test reports which you are on, and the
`quota` health check reads the real remaining count from Fivetran's headers.

## Three conventions worth knowing

### 1. The Accept header carries the API version

`Accept: application/json;version=2` — the spec's own default. Fivetran answers
**`406 Not Acceptable`** for a header it does not recognise, which is a baffling
failure if you have not seen it. Fivetran's own "getting started" page still
shows a bare `application/json`; this app pins the version on every request, and
a `406` is reported as exactly that.

### 2. Everything is enveloped

`{"code": "Success", "message": "…", "data": {…}}` on success, and
`{"code": …, "message": …}` with no `data` on failure. The client unwraps `data`
so no action carries the envelope, and surfaces `message` on an error.

### 3. A "group" is a destination

The most confusing thing in the API, and confusing in Fivetran's own
documentation: `GET /v1/groups` is officially titled *"List All Destinations
within Account"*. A group is the container connections belong to; a destination
is the warehouse it writes into. **Same object, same id, two names.** Both
appear here because both appear in the API and in Fivetran's UI.

## Actions

| Key | Type | Description |
|---|---|---|
| `connection-list` | read | Every pipeline, with broken / warning / paused separated |
| `connection-get` | read | Is this one working, and is its data complete? |
| `connection-sync` | perform | **Incremental sync** — the cheap one |
| `connection-resync` | perform | **Full historical re-sync — re-bills every row** |
| `connection-pause` | perform | Stop or resume a pipeline |
| `connection-sync-history` | read | Recent runs, durations and failures (7-day cap) |
| `connection-schema-get` | read | Which tables and columns actually sync |
| `connection-test` | perform | Re-check credentials after fixing the source |
| `group-list` | read | The destinations, under their other name |
| `group-connection-list` | read | Everything feeding one warehouse |
| `destination-list` | read | The warehouses, and which are broken |
| `destination-get` | read | One warehouse, its region and time zone |
| `transformation-list` | read | The dbt jobs, and which are failing |
| `transformation-get` | read | One job and its schedule |
| `transformation-run` | perform | **Run the dbt models** |
| `transformation-cancel` | perform | Stop a running transformation |
| `transformation-project-list` | read | The dbt repos, branches and versions |
| `account-info-get` | read | Which account, and is it a trial? |
| `user-list` | read | Who can reach the pipelines |
| `connector-type-list` | read | Every source Fivetran can read |

## The distinction that costs money

**`connection-sync` is incremental.** It reads what changed since the last run —
what the schedule does anyway, just now. Cheap, routine, and the right call
after an upstream job finishes.

**`connection-resync` re-reads the entire source from the beginning.** Fivetran
bills by **monthly active rows** — rows touched in a month — so re-syncing a
table that has not changed still bills every row in it. On a large connection
that is real, unbudgeted money, and it arrives on next month's invoice rather
than as an error. It also runs for hours to days, displacing the normal
schedule.

There are good reasons to do it: a source corrected its history, a schema change
needs backfilling, a sync was broken long enough to leave gaps. All of them are
decisions a person makes, so this action requires an explicit acknowledgement
rather than being one boolean away from the ordinary sync.

**Scope it.** `scope` re-syncs named tables within named schemas and costs
proportionally less — usually what the reason actually calls for. An empty scope
object is rejected with a `400` rather than being read as "everything", which is
the right default; this app refuses it first and says why.

## Six things that go wrong quietly

### 1. A trigger returns when the sync is queued, not when data lands

`connection-sync` comes back immediately. A workflow that treats a successful
trigger as fresh data is asserting something it never checked — `connection-get`
reading `sync_state` is the other half.

The same applies to `transformation-run`: firing it before the sync finishes
transforms yesterday's data. That is not an error and it produces a report that
is quietly a day old.

### 2. `broken` stops syncing silently

A connection whose source credentials expired sits at `setup_state: broken` and
simply stops. **The warehouse does not empty — it stops changing**, and every
dashboard built on it keeps rendering yesterday's numbers as though they were
today's. That is what the `connections` health check exists for.

### 3. A connection can be healthy and its data incomplete

`warnings` on an otherwise-fine connection means Fivetran is syncing and
something did not apply — a schema change it declined, a column it could not
map. Nothing looks wrong. `connection-get` returns `hasWarnings` separately from
`healthy` for exactly this.

### 4. Paused is a decision, not a fault

`connection-list` counts paused connections apart from broken ones. Reporting
somebody's deliberate pause as an incident is how a monitoring workflow trains
people to ignore it.

And **resuming catches up**: a connection paused for a week reads everything
that changed during that week in one sync — correct, and much larger than usual.

### 5. Sync history is capped at seven days

Fivetran will not return a longer window, and asking for a month does not fail —
it truncates. So this is a monitor rather than an archive: trend data over
quarters has to be collected as it goes. `connection-sync-history` refuses a
range over seven days rather than returning a silently shortened one.

### 6. A broken destination looks like a dozen broken sources

A destination whose credentials expired breaks every connection writing to it at
once. From `connection-list` that is a dozen unrelated sources failing
simultaneously; `destination-list` turns twelve mysteries into one.

## Setup tests have their own, much tighter budget

`connection-test` re-checks credentials and connectivity — what to call after
somebody has fixed something at the source, to move a connection out of
`broken` without waiting for its next scheduled attempt.

It is limited to **250 a minute and 2,500 an hour** on a paid plan and **50 an
hour** on a trial, and it consumes the *source interaction* budget at the same
time, so one test spends from two allowances. It is a repair step, not a
monitor.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Fivetran up? |
| `connections` | dependency | **Are this account's pipelines actually working?** |
| `quota` | quota | **Requests left this hour** — a real reading |

`service` reads `status.fivetran.com`, which publishes **exactly one thing**.
Verified 2026-08-18: `/api/v2/status.json` returns
`{"status":{"indicator":"none","description":"All Systems Operational"},"page":{"updated_at":…}}`
and **`components.json` and `incidents.json` both answer 404**. There is no page
`id` or `name` either — it is Statuspage-shaped rather than a Statuspage. So
this check reads the indicator and no more, which is coarser than most in this
pack and is the whole of what the vendor publishes.

`connections` is where the question a data team actually asks gets answered,
from the account itself. A `broken` connection is `down`; **warnings are
`degraded`**, because syncing-with-incomplete-data is worse than an outage in
one specific way — nothing looks wrong; and a **paused connection is `ok`**,
because it is somebody's decision. It reads one page of a hundred rather than
every connection: an account with hundreds is exactly the account whose rate
limit matters, and a sample finds a systemic problem just as well.

`quota` is a **real reading**, not a declared absence. Fivetran sends
`X-Rate-Limit` and `X-Rate-Limit-Remaining` on responses and `Retry-After` when
it refuses, so this reports genuine headroom — and names a limit of 500 as a
trial-tier allowance, which turns a number into a fact somebody can act on. When
no header arrives it reports `unknown` rather than assuming a limit, because a
confident wrong answer is worse than none.

## What this app deliberately does not do

- **Create or delete connections and destinations.** Creating one means handing
  Fivetran a source's credentials, and deleting one **discards its sync state**
  — so recreating it later means a full historical re-sync, which is the
  expensive accident this app works hardest to prevent. Fivetran ships a
  Terraform provider for exactly this.
- **Edit schema configuration.** Enabling a table changes what is billed;
  disabling one silently stops a downstream model. Both are deliberate acts.
- **Manage users, teams or roles.** Reading them is an access review; granting
  access to the system holding every source credential is not a workflow step.
- **Certificates, fingerprints, private links, proxy agents, hybrid deployment
  agents.** Network and trust plumbing, configured once by an infrastructure
  team.
- **Connector SDK packages.** Publishing custom connector code is a build
  pipeline, not an automation.

## Errors

A `406` points at the Accept header, because nothing else explains it. A `409`
says a sync is already running — Fivetran declines a re-sync rather than
queueing it. A `429` reports the `Retry-After`, the limit from the header, and
the trial-versus-paid difference that usually caused it. A `401` names the three
kinds of key, since they reach different things.
