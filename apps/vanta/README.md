# Vanta

Read a compliance program: failing tests and the resources causing them,
controls and their owners, issues against their due dates, vulnerabilities
against their SLAs, people's overdue tasks, and the vendor inventory.

- **Categories** — legal, security, monitoring
- **Auth methods** — client-credentials
- **Actions** — 25
- **Egress allowlist** — `api.vanta.com`, `api.vanta-gov.com` (the `service`
  health check adds `status.vanta.com`)
- **Website** — https://www.vanta.com
- **API docs** — https://developer.vanta.com/reference/manage-vanta ·
  spec: `https://developer.vanta.com/reference/manage-vanta.json` (164 paths)

Every path this app calls was checked against that document on 2026-08-18.

## Which of Vanta's three APIs this is

**Manage Vanta** — the operational surface for *your own tenant*, which is the
one a customer's workflow can use. The **Build Integrations** API is for
partners pushing data into customers' tenants, and the **Auditor API** is for
audit firms; neither is this.

## Setup

Create a **Manage Vanta** application in Vanta → Settings → Developer Console,
and paste its client id and secret. The app exchanges them for a one-hour token
with the `client_credentials` grant — no browser sign-in, so it works in a
scheduled run.

### One active token per application — read this before adding a second connection

Vanta's own words: *"Requesting a new token with the same `client_id` /
`client_secret` immediately revokes the previous one — any in-flight requests
using the old token will fail with `401`."*

That has consequences that are invisible until they bite:

- **Two connections built from the same application will fight.** Each refresh
  silently kills the other's token, and both fail with `401` at unpredictable
  times. If two workflows need Vanta, **create two applications**.
- The same is true of anything else using those credentials — a CI job, a
  script, a colleague's laptop.
- So this app mints a token in `exchange`, again only in `refresh`, and never
  per request.

This is also why a `401` from Vanta is reported as *"the token may have expired,
or another process may have minted one for the same application"* rather than
"bad credential" — sending somebody to rotate a perfectly good secret is the
wrong outcome.

### Scopes are requested at token time

Unlike most APIs, the scope is a parameter of the token request rather than a
property of the credential:

| Scope | Grants |
|---|---|
| `vanta-api.all:read` | `GET` on everything — covers all 22 read actions here |
| `vanta-api.all:write` | Writes — needed only for the three write actions |
| `vanta-api.documents:read` etc. | Narrower, per resource |

`vanta-api.all:read` is the default. Requesting a scope the application was not
created for returns `invalid_scope` and fails the whole exchange, so a narrower
key fails at connect time rather than on the fourth step of a run.

### Vanta Gov

FedRAMP tenants use `api.vanta-gov.com`, **including its own token endpoint**.
A credential for one region is unknown to the other, so the region is a field
rather than a guess.

## Actions

| Key | Type | Description |
|---|---|---|
| `test-list` | read | **What is failing** — the core of most workflows |
| `test-get` | read | One test, its controls and what feeds it |
| `test-entity-list` | read | **Which resources** are failing it |
| `test-entity-deactivate` | perform | Exclude a resource — a compliance exception |
| `control-list` | read | Requirements, and which have no owner |
| `control-get` | read | One control with its evidence |
| `control-set-owner` | perform | Make somebody accountable |
| `framework-list` | read | What this organisation is held to |
| `framework-control-list` | read | One framework's requirements, in its structure |
| `document-list` | read | Non-automated evidence, by status |
| `policy-list` | read | Policies and their approval state |
| `issue-list` | read | **The work queue**, by due date |
| `issue-get` | read | One issue, for a ticket |
| `risk-scenario-list` | read | The risk register |
| `vulnerability-list` | read | Findings **against their SLA deadlines** |
| `vulnerability-get` | read | One finding, its package and CVE |
| `vulnerability-remediation-list` | read | What was fixed, and whether in time |
| `person-list` | read | Everybody covered, and their overdue tasks |
| `person-offboard` | perform | Complete the offboarding checklist |
| `user-list` | read | People with a Vanta **login** |
| `vendor-list` | read | The third-party inventory |
| `vendor-get` | read | One supplier and its assessment |
| `integration-list` | read | What is feeding Vanta evidence |
| `monitored-computer-list` | read | The fleet, and its compliance state |
| `event-log-list` | read | Who changed the compliance program |

## Seven things that go wrong quietly

### 1. A person is not a user

Two rosters, and confusing them is the most common mistake here:

- a **person** is somebody the compliance program covers — every employee,
  whether or not they have ever opened Vanta;
- a **user** is somebody with a Vanta login.

**Every ownership field takes a user id.** `control-set-owner`, an issue's
owner, `person-offboard`'s acknowledger — all from `user-list`. Looking somebody
up in `person-list` and passing that id will not work.

### 2. Three of the six test statuses are not failures

`NEEDS_ATTENTION` means broken. `IN_PROGRESS` means Vanta is still computing,
`DEACTIVATED` means somebody switched the test off, and `NOT_APPLICABLE`,
`INVALID` and `OK` are the rest. A dashboard counting "not OK" as failing counts
tests nobody has finished evaluating and tests somebody deliberately excluded.

`test-list` therefore defaults to `NEEDS_ATTENTION`, and excludes tests still in
rollout — those have no history and would inflate any failure count.

### 3. A page is ten rows unless you say otherwise

Vanta's `pageSize` **defaults to 10** and caps at 100. Ten failing tests out of
four hundred looks like a healthy tenant, and nothing in the response says
otherwise except a flag most callers forget. Every action here asks for 100,
pages, and returns `hasNextPage` so a truncated walk is visible.

### 4. Deactivating a test entity does not fix anything

It tells Vanta to stop counting that resource: the test goes green and the
underlying condition stays exactly as it was. That is legitimate — a
decommissioned server, a genuinely out-of-scope bucket — and it is also how a
compliance program hollows out.

The difference is the **reason** and the **expiry**. Vanta requires the reason
and puts it in the audit trail where an auditor reads it; a workflow writing
"automated" has produced an exception nobody can defend. The expiry is optional
in the API and effectively required in practice, because an indefinite exclusion
outlives its justification and stops appearing in any report — so this action
defaults to 90 days and **warns** when given none.

### 5. A disconnected integration does not fail its tests

It makes them **stale**. Every automated test is downstream of an integration,
and when one disconnects — a rotated credential, a revoked grant — the tests it
feeds keep reporting whatever they last knew. The dashboard stays green while
the evidence rots.

`integration-list` is the check worth running before trusting a compliance
report, and the one nobody thinks to run. The `service` health check covers
Vanta's side of the same problem.

### 6. Filtering people by task needs both filters

`taskTypeMatchesAny` and `taskStatusMatchesAny` **require each other** — Vanta's
own schema says so — and sending one alone is silently ignored, producing a
report that looks filtered and is not. `person-list` refuses the pair instead.

Also: `FORMER` people still appear. An offboarding report that forgets
`employmentStatus` counts everybody who ever worked there.

### 7. A machine that stopped reporting has no state

Device compliance fails one laptop at a time, and the worst case is not a
failure — it is a machine that stopped reporting altogether, which has no status
to count. A report built by counting failures misses it, which is why
`monitored-computer-list` says so rather than leaving it to be discovered.

## Rate limits, and why they shape the design

| Limit | Value |
|---|---|
| Manage Vanta endpoints | **50 / minute** |
| `/oauth/token` | **5 / minute** |

The second is the sharp one. Five token requests a minute makes minting per
request impossible, and it compounds with the one-active-token rule: a workflow
reacting to a `401` by immediately re-minting can exhaust the token limit in
seconds and then have neither a working token nor a way to get one.

So the token's expiry is recorded a minute early rather than refreshed at the
last moment, the `tenant` health check runs only four times an hour so it does
not crowd out real work, and a `429` names **which** of the two limits was hit.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Vanta up — and is its evidence collection working? |
| `tenant` | dependency | Can **this connection** reach its own tenant? |
| `quota` | quota | Declared absence — see below |

`service` reads `status.vanta.com` and makes a distinction the page does not.
`Vanta Public API` and `Core App` count at full weight. The integrations
components are **capped at `degraded`**, because their failure does not stop the
API answering — it makes the answers stale, and *"the API is up and the answers
are going stale"* is the accurate thing to tell a workflow acting on a test
result. Product surfaces this app never touches — Trust Center, Vanta AI, MCP,
Audit Hub — are reported and do not count.

`tenant` probes `GET /v1/frameworks?pageSize=1`. Its `401` is reported as
`degraded` with the one-active-token explanation rather than left to the derived
credential check, because this is the one case where "your secret is wrong" and
"something else is using your credentials" need to be said differently. A `429`
is `degraded` too — being crowded out of a 50-per-minute budget is not the
tenant being down.

`quota` is a **declared absence**. Vanta publishes both limits and documents no
`Retry-After` or `X-RateLimit-*` header and no usage endpoint — its reference
says only to back off and retry. A poll would spend one of the fifty every
interval to report `unknown`, which is a strictly negative trade.

## What this app deliberately does not do

- **Acknowledge a missed remediation SLA.** Vanta has the endpoint. Writing
  "acknowledged by automation" against a missed security deadline is not
  something a workflow should be able to do.
- **Delete anything** — controls, vendors, documents, findings. Deleting a
  compliance record by accident is not recoverable, and none of it is
  automation-shaped.
- **Upload evidence files.** The document and vendor upload endpoints move bytes
  the sandbox cannot produce.
- **Trust Center.** It is a public-facing product with its own `slugId` and
  around eighty endpoints — a separate app's worth of surface, and a publishing
  decision rather than a compliance one.
- **The Build Integrations and Auditor APIs.** Different audiences, different
  credentials.

## Errors

A `401` names the one-active-token rule alongside expiry. A `403` explains that
scopes are chosen at token time and must match the application. A `429` names
both limits and which one is likely. Field-level validation errors are surfaced
with the field.
