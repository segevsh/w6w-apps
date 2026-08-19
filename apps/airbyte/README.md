# Airbyte

Inspect connections, sources and destinations, trigger and watch syncs, and
read job history.

- **Categories** — data-warehousing, devops
- **Auth methods** — application
- **Actions** — 12
- **Egress allowlist** — `*`
- **Website** — https://airbyte.com
- **API docs** — https://reference.airbyte.com

Built against Airbyte's own OpenAPI definitions and probed live on 2026-08-19.

> **On the allowlist.** Airbyte is open source and self-managed as often as it
> is used on Cloud, so a deployment can be at any address. Same reasoning as
> `apps/nocodb` and `apps/typesense`.

## Access tokens last three minutes

Airbyte's documentation, verbatim: *"Access tokens are short-lived, and are only
valid for 3 minutes. We recommend fetching a new token before each request."*

That is the shortest credential lifetime in this pack by two orders of
magnitude, and it decides how the connection works. The stored credential is the
**application** — a client id and secret — and the runtime mints tokens as it
goes; `expiresAt` is set a little short of the reported lifetime so a refresh
happens *before* a request rather than after a 401. Self-Managed Enterprise gets
24 hours; Cloud and open source get three minutes.

It also means a 401 here is nearly always expiry rather than a wrong credential,
which `describeError` says.

Two more things about the credential worth knowing. An application **inherits
the permissions of the user who created it** — Airbyte's own wording — so a
workflow reaches whatever that person reaches and loses it when they leave. And
a rejected token request returns **401 with a body of `{"errorId":"…"}`**:
verified live, no message, no code, nothing but a uuid to quote at support.

## A finished job can be `incomplete`

The job statuses are `pending`, `running`, `incomplete`, `failed`, `succeeded`
and `cancelled`. **`incomplete`** is the one that gets missed: a sync where some
streams landed and others did not.

A workflow branching on `status === "failed"` treats it as a success and moves
on with a table that is silently missing rows. So:

- `job-get` returns **`finished` and `succeeded` as separate booleans**, because
  collapsing them is exactly the mistake.
- `job-list` counts incomplete apart from both, and reports `lastSuccessAt` —
  when data last *fully* arrived, which is the number people mean by "is the
  pipeline healthy".

## `reset` is one word away from `sync`, and it deletes

`POST /jobs` takes `jobType: "sync" | "reset"` — the same endpoint, the same
body. A reset **clears the connection's data in the destination** and wipes the
incremental state, so the next sync re-reads the source in full.

That is why `sync-reset` is a separate, confirmed action rather than a parameter
on `sync-trigger`, and an `index.ts` test asserts `sync-trigger` cannot send a
reset. The action also names where the cost lands: the re-read is the expensive
half, and it is paid by the *source* — days on a rate-limited API, a bill on a
metered warehouse.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `connection-list` | search | The pipelines, with the paused ones separated |
| `connection-get` | read | One pipeline, with its per-stream sync modes |
| `connection-pause` | perform | Stop or resume a pipeline |
| `sync-trigger` | perform | Start a sync now |
| `sync-reset` | perform | **Destructive** — clear the destination and start again |
| `job-list` | search | Sync history, with durations computed |
| `job-get` | read | How one sync actually went |
| `job-cancel` | perform | Stop a running sync |
| `source-list` | search | Where the data comes from |
| `destination-list` | search | Where it lands |
| `stream-properties-get` | read | What a stream is capable of |
| `workspace-list` | search | What this application actually reaches |

### Things the actions do that the API does not

- **`sync-trigger` treats an already-running sync as a state, not an error.**
  Airbyte runs one job per connection and answers **409** rather than queuing,
  which for an event-driven trigger is normal rather than exceptional — so it
  comes back as `alreadyRunning`. It also flags triggering an **inactive**
  connection, which Airbyte permits: either a deliberate one-off or a workflow
  quietly working around a pause somebody meant.
- **`job-list` refuses to filter by connection and workspace at once.** Airbyte
  documents that it keeps the connection id and *silently ignores* the
  workspaces — a precedence rather than an error, and the sort of thing that
  makes a report quietly narrower than it looks.
- **Durations are computed here.** Airbyte reports start and update timestamps
  and no duration; a sync that took four minutes last week and forty today is
  the early warning for a source about to start timing out.
- **`connection-get` names the append-only streams.** Sync mode is per stream,
  and `incremental_append` accumulates while `incremental_deduped_history`
  does not — the difference between an event log and a table that doubles every
  night. It also reports the namespace, which is how a connection ends up
  writing correctly into a schema nobody queries.
- **`connection-list` separates inactive and manual connections.** A paused
  connection is the commonest cause of "the data is stale and nothing is
  broken": the destination simply stops being updated, and nothing in the
  destination says so. Airbyte also pauses connections *itself* after repeated
  failures, which `connection-pause` notes when resuming one.
- **`job-cancel` explains its own verb.** Airbyte's endpoint is a `DELETE`, but
  the job record survives as `cancelled` — what stops is the work. And because
  Airbyte writes as it goes, a cancelled sync leaves the destination partly
  written; the remedy is another sync, not a rollback.
- **`stream-properties-get` answers "can this be incremental?" before it is
  attempted.** A stream syncs incrementally only if the connector exposes a
  cursor, so the question is a fact about the connector rather than a
  preference. It also names the streams that *can* go incremental with **no
  cursor defined** — where a person picks one, and picking a non-monotonic
  column loses rows with no error at all.
- **`source-list` frames itself as an inventory.** Every source holds a
  credential to somebody else's system, so the list is what one compromise of
  Airbyte would reach. The secrets themselves come back masked.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Airbyte Cloud's status — informational |
| `api` | dependency | connection | **none** | Is this connection's Airbyte answering |

### `api` — unauthenticated, which matters more here than usual

`GET /v1/health` needs no credential. That is worth using because tokens last
three minutes: a signed check would spend most of its life reporting on the
token, and every expiry would look like an outage.

The response is **plain text** — verified live, `200` with the body
`Successful operation` and a wildcard content type — so a check that parses it
as JSON fails on a perfectly healthy Airbyte. On a self-managed host a 404 is
reported as the API not being exposed at that path rather than as an outage,
which is what it almost always is.

### `service` — informational, and weak evidence anyway

The feed covers Airbyte Cloud, and much of Airbyte is self-managed. But there is
a second reason it is not fatal, particular to this app: **a stale pipeline
usually has nothing to do with Airbyte's health.** It is a paused connection, a
source whose credentials expired, or a schema change the connector could not
handle — all of which leave Airbyte perfectly operational and the warehouse
quietly out of date. `job-list` and `connection-list` are where that question is
answered.

## Icon

`assets/icon.svg`, downloaded verbatim from `airbyte.com/favicon.svg` on
2026-08-19 (md5 `a2e1020fc4737845e6d263c773f99dd2`). Checked in both themes with
`_tools/icon-legibility.ts`.

## Tests

258 assertions across 17 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus two specific to this app: **`sync-trigger` cannot send a reset**,
and the job actions **never fold `incomplete` into success or failure**.
