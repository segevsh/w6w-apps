# dbt Cloud

Trigger and watch the builds that produce a warehouse's tables, download the
artifacts they leave behind, and read the projects, environments and access
behind them.

- **Categories** — data-warehousing, devops, analytics
- **Auth methods** — token
- **Actions** — 23
- **Egress allowlist** — `cloud.getdbt.com`, `*.dbt.com` (the `service` health
  check adds `status.getdbt.com`)
- **Website** — https://www.getdbt.com
- **API docs** — https://docs.getdbt.com/docs/dbt-cloud-apis/admin-cloud-api ·
  spec: `github.com/dbt-labs/dbt-cloud-openapi-spec`
  (`openapi-v2.yaml`, `openapi-v3.yaml`)

Every path this app calls was checked against those two documents on
2026-08-18 — v2 has 52 operations and v3 has 155.

## Setup

### Token

1. dbt Cloud → **Account Settings**.
2. **Service tokens** for automation, or **Personal tokens** for yourself.
3. Copy the **Access URL** from the same settings page.

**Prefer a service token.** It belongs to the account rather than a person, it
survives that person leaving, and its permission sets can be narrowed to *Job
Admin* or *Read-Only*. A personal access token carries one person's permissions
and attributes every action to them.

### The Access URL is not optional guesswork

dbt Cloud runs in cells, and an account lives in exactly one:
`{prefix}.us1.dbt.com`, `.us2`, `.us3`, `.us5`, `.eu1`…`.eu4`, `.au1`, `.au2`,
`.jp1` — with `cloud.getdbt.com` (US), `emea.dbt.com` and `au.dbt.com` still
serving older accounts.

**A valid token presented to the wrong cell answers `401 Invalid token.`** —
byte-for-byte what a bad token returns, because the token is simply unknown
there. So the field is asked for rather than guessed, and both the connection
test and every 401 error name the region as a possible cause.

> **Single-tenant and VPC deployments** use a custom vanity hostname assigned at
> onboarding. Those are **not** on this app's egress allowlist, which covers
> `*.dbt.com` and the legacy `cloud.getdbt.com` only. A vanity host needs the
> manifest widened.

### The account id is discovered, not typed

`GET /api/v2/accounts/` runs at connect time; the account's id and name are
recorded on the connection, and no action asks for them. That is deliberate — a
wrong account id produces a `404` that reads like a missing job. Set the
optional **Account ID** field only when a token reaches more than one account.

## Two API versions, and both are current

This is not a deprecation. The versions divide by subject:

| Version | Owns |
|---|---|
| **v2** | Runs and jobs. **There are no run endpoints in v3 at all** |
| **v3** | Projects, environments, environment variables, warehouse connections, users, groups, service tokens, audit logs |

dbt's own docs say v3 is preferred "but we don't yet have all our v2 routes
upgraded". Each action uses whichever version has the endpoint.

Every response is enveloped as `{data, status: {code, is_success, user_message,
developer_message}}`, with lists adding `{extra: {pagination: {count,
total_count}}}`. The app unwraps `data` so actions never carry the envelope
around, and surfaces `user_message` — the readable half — on an error.

## Actions

| Key | Type | Description |
|---|---|---|
| `job-list` | read | Jobs, with how each last did |
| `job-get` | read | One job's commands, environment and triggers |
| `job-run` | perform | **Trigger a run** — returns queued, not finished |
| `job-rerun` | perform | Resume the last failed run — **or rebuild everything** |
| `run-list` | read | Run history, or the in-flight queue |
| `run-get` | read | Where a run has got to |
| `run-cancel` | perform | Stop a run, leaving what it built |
| `run-retry` | perform | Resume a specific run from its point of failure |
| `run-retry-details` | read | Whether a retry would be accepted, and which models failed |
| `run-step-get` | read | One dbt command inside a run, with opt-in logs |
| `run-artifact-list` | read | What a run left behind |
| `run-artifact-get` | read | **`run_results.json`, `manifest.json`, `catalog.json`** |
| `job-artifact-get` | read | The same, from a job's last successful run |
| `account-list` | read | The accounts this token can reach |
| `project-list` | read | Projects — names to ids |
| `project-get` | read | One project, its repo and its warehouse |
| `environment-list` | read | Where a project's jobs build |
| `environment-variable-list` | read | Variables per environment; secrets masked |
| `connection-list` | read | The warehouses dbt builds into |
| `user-list` | read | Who can get in, and the licence counts that cost money |
| `group-list` | read | Where permissions actually hang |
| `service-token-list` | read | Machine credentials, and which are unused |
| `audit-log-list` | read | Who changed what (Enterprise) |

## Six things that go wrong quietly

### 1. A triggered run has not built anything

`job-run` returns a Run at status **1 (Queued)**. No model has compiled and no
test has passed. A workflow that treats a successful trigger as a successful
build is asserting something it never checked — `run-get` polling `is_complete`
is the second half.

### 2. Run status is a number, and the numbers skip

`1` Queued, `2` Starting, `3` Running, `10` Success, `20` Error, `30` Cancelled.
**There is no 4 through 9.** A condition written as `status === 4` waits forever
and `status > 3` works by accident.

dbt returns `is_complete`, `is_success`, `is_error` and `is_cancelled` alongside,
and those are what to branch on. Every action here adds `statusName` so a
notification can say "Error" rather than "20".

### 3. `job-rerun` means two different things

dbt describes it as retrying from the point of failure "if the run failed.
Otherwise trigger a new run". So:

- last run failed → resume, building only what failed. Minutes.
- last run succeeded → **a complete fresh build of every model.** Hours, and a
  full warehouse rebuild nobody asked for.

It is convenient for a human clicking a button and a trap for a schedule, so
this action requires an explicit acknowledgement. `run-retry` on a run id
refuses rather than escalating.

### 4. Retry only works on a job's most recent run

`run-retry` is refused with a named reason — `RETRY_NOT_LATEST_RUN`,
`RETRY_NOT_FAILED_RUN`, `RETRY_NO_RUN_RESULTS`, `RETRY_UNSUPPORTED_CMD`,
`RETRY_UNSUPPORTED_VERSION`. **`RETRY_NOT_LATEST_RUN` is the one that catches
people**: a workflow that retries an hour later, after the schedule has fired
again, is refused.

`run-retry-details` asks first, which is the right shape for a workflow that
falls back to a full run. It also returns **which models failed** — the
difference between "the nightly build failed" and "`fct_orders` failed on a
permission error, 340 models were fine".

### 5. Artifacts are per-step, and the default is the last one

A job with several dbt commands produces artifacts for each. Asking without a
`step` gives the **last** step's — so on a job ending in `dbt test`, the default
is not the build's `run_results.json`. `run-artifact-list` shows what each step
left, and asking it first is how a "job with no docs step" stops looking like a
broken integration.

`job-artifact-get` reads a job's last **successful** run, which on a job that
has been failing for a week returns a week-old manifest, cheerfully.

### 6. Cancelling does not undo

dbt writes each model as it finishes, so a run stopped halfway leaves the
warehouse partially rebuilt — some tables from this run, some from the last.
Usually fine, occasionally very much not, and no API can tell you which.

## Artifacts, and why a workflow wants them

They are the only machine-readable account of what a build actually did:

- **`run_results.json`** — every node with status, timing and error message.
  `run-artifact-get`'s **summary** mode returns exactly the per-node results and
  the ones that did not pass, which is the useful half.
- **`manifest.json`** — the whole project: models, sources, tests and the
  dependency graph. It is what catalogues and lineage tools read, and it is
  **large** — tens of megabytes on a big project — which is why **raw** mode
  exists.
- **`catalog.json`** — warehouse columns and types, present only if the job ran
  `dbt docs generate`.

## Secrets, logs and other things not returned

- **Environment variables come back masked.** A `DBT_ENV_SECRET_*` value is
  `**********`, by dbt's design. That is what makes
  `environment-variable-list` safe to hand to a configuration audit: it returns
  `secretNames` so a drift check can say "staging is missing
  `DBT_ENV_SECRET_SNOWFLAKE_KEY`" without ever seeing a key. It cannot compare
  two masked values — they are equal whether or not the secrets are.
- **Debug logs are never returned.** `run-step-get` drops `debug_logs`
  entirely and returns `logs` only when asked, with a **tail** option, because
  the last fifty lines hold the error and the rest is a build transcript.
- **Service tokens never return their value.** dbt shows it once at creation, so
  `service-token-list` is safe to schedule — it reports what exists, what each
  can do, and which have never been used.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is dbt Cloud up? |
| `account` | dependency | Is **this connection's** account reachable and active? |
| `quota` | quota | Declared absence — see below |

`service` reads `status.getdbt.com`, and reads it differently from every other
Statuspage app in this pack. Measured 2026-08-18, the page is real — its `page`
block is `{"id":"01JBH53RGT63T7EM45RY826C4H","name":"dbt Cloud",…}` — but
**`components.json` returns `{"components":[]}`**. dbt publishes no components
at all, so a per-component check would find nothing to watch and report
`unknown` forever. This reads the overall indicator instead, which is coarser
and is the whole of what the vendor says. It still reports components if dbt
ever fills them in.

`account` covers what the status page cannot: cells, and single-tenant
deployments that are not on the public page at all. It probes
`GET /api/v2/accounts/{id}/` and distinguishes three failures — a `401` is left
`unknown` (the derived `auth:token` check owns credentials), a `403` is
`degraded` and named as a permission-set problem, and an account whose `state`
is not active is `degraded` because **a locked or cancelled account still
answers while every scheduled job in it silently stops running**.

`quota` is a **declared absence**, and the numbers are in it. dbt documents
5,000 requests per minute for the Administrative API (the Discovery GraphQL API
has a separate 500/minute; SCIM user writes 20 per 5 seconds), returning `429`
with `Retry-After` and `x-rate-limit-retry-after-seconds`. Those headers appear
**only on the 429** — no successful response carries remaining headroom, and
there is no usage endpoint. A poll could only report `ok` until the moment it
reported `down`, while spending a request per interval against the budget it is
watching.

**It matters more here than usual: dbt enforces a five-minute cooldown once the
limit is hit.** The penalty is not "wait a moment", it is the account's API shut
for five minutes — and a retry loop that tightens on failure makes it worse. So
`describeError` says that on the 429 itself.

## What this app deliberately does not do

- **Create or edit jobs, environments, projects or connections.** Those are
  infrastructure, and dbt Labs ships a Terraform provider for them. A workflow
  that edits a job definition is configuration drift with extra steps.
- **Manage users, groups or permissions.** SCIM and the group APIs exist, and
  granting warehouse access from a workflow is a decision that belongs with the
  identity provider.
- **The Discovery (GraphQL) API.** It is a separate surface with its own rate
  limit and its own query language, and it answers questions about the
  *metadata* rather than the *builds*.
- **Delete anything.** Nothing here removes a job, run, project or token.

## Errors

`user_message` is written for a person and is what gets surfaced;
`developer_message` is appended when dbt sends one. A `401` names the
wrong-region possibility alongside a bad token, and a `429` reports the
retry-after value and the five-minute cooldown.
