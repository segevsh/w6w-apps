# Gusto

Read and update a Gusto payroll account from a workflow — employees,
contractors, compensation, payrolls, pay schedules, time off and departments.

- **Categories** — hr, finance, productivity
- **Auth methods** — oauth2, oauth2-demo
- **Actions** — 23
- **Egress allowlist** — `api.gusto.com`, `api.gusto-demo.com`
- **Website** — https://gusto.com
- **API docs** — https://docs.gusto.com/app-integrations ·
  paths verified against Gusto's own generated client,
  [`Gusto/gusto-python-client`](https://github.com/Gusto/gusto-python-client)
  (`gusto_app_int_v_2026_06_15`, fetched 2026-08-18)

This is Gusto's **App Integrations** API — the surface an app uses to work with
an existing Gusto customer's account. Embedded Payroll, the other surface, is
for platforms that *host* payroll and requires a partnership.

## Setup

1. Register a developer app at Gusto's developer portal and set its redirect
   URI to this installation's.
2. Its configured permissions decide what the token can reach — Gusto's OAuth
   flow takes no `scope` parameter, so nothing is requested per-connection.
3. Connect with **OAuth (Demo)** first. Gusto's demo environment is a separate
   installation with separate accounts and separate credentials, and it is the
   only safe place to develop a payroll integration.

The connection test uses `GET /v1/token_info`, the one call that needs neither a
company id nor any particular permission — a read of a business resource would
report a *missing permission* as a broken connection.

### Access tokens live two hours; refresh tokens are single-use

Gusto's documentation is explicit about both: an **access token expires after 2
hours**, and a **refresh token is invalid after one use**. Every refresh returns
a *new* refresh token, and a host that does not persist it ends the connection
permanently — there is no second chance short of sending the user back through
the browser.

That is why a `401` from this app says "the refresh did not happen" rather than
"your token is wrong". After two hours, that is nearly always what it means.

## The API version header is not optional, and its default is deprecated

Measured against `api.gusto-demo.com` on 2026-08-18. `X-Gusto-API-Version`
changes the answer, and the response tells you what it did:

| Sent | Served | `deprecation` header |
|---|---|---|
| *(nothing)* | default | `@1719792000` — 1 July 2024 |
| `2024-04-01` | `2024-04-01` | `@1749945600` — already past |
| `2025-06-15` | `2025-06-15` | `@1763337600` — already past |
| **`2026-06-15`** | `2026-06-15` | **none** — current |
| `2099-01-01` | **`2026-06-15`** | none — an unknown version silently falls back |

This app pins `2026-06-15` on every request, which is also what Gusto's own
`gusto_app_int_v_2026_06_15` SDK defaults to.

And because the notice arrives as a **response header**, the `api-version`
health check reads it — see below. A pinned API version is a silent liability:
it works perfectly until it does not, and the warning is in a header nobody
looks at.

## `version` is an optimistic lock, and this app does not defeat it

Every Gusto write carries the record's `version` as last read, and Gusto rejects
a stale one rather than overwriting whatever changed in between. That turns the
classic lost update — two systems editing one employee, last writer wins — into
a `422` a workflow can retry.

So `employee-update` and `department-people-add` **ask for the version** instead
of fetching it themselves. Re-reading and forcing the write through would defeat
the lock: the caller would be overwriting a change they never saw, which is
exactly what the mechanism prevents. Read the record immediately before writing,
pass its version, and retry on `422` — the client's error message names that
case specifically.

## Actions

| Key | Type | Description |
|---|---|---|
| `token-info` | read | What this token reaches — and which company id to use |
| `company-get` | read | The company, its status and its version |
| `company-admin-list` | read | Who can approve a payroll decision |
| `company-location-list` | read | Work locations — which decide state tax |
| `employee-list` | read | The roster (terminated people excluded by default) |
| `employee-get` | read | One employee, with the version a write needs |
| `employee-create` | perform | Start onboarding — **not** a hire |
| `employee-update` | perform | Name, emails, date of birth |
| `employee-terminate` | perform | End an employment — confirmation required |
| `employee-home-address-list` | read | Address history, with effective dates |
| `job-compensation-list` | read | A job's pay history |
| `garnishment-list` | read | Court-ordered deductions (read-only) |
| `contractor-list` | read | Contractors — a separate collection |
| `contractor-payment-list` | read | What contractors were paid, by window |
| `payroll-list` | read | Payroll runs, processed and draft |
| `payroll-get` | read | One payroll, broken down per employee |
| `pay-period-list` | read | The pay calendar, with deadlines |
| `pay-schedule-list` | read | How often people are paid |
| `time-off-request-list` | read | Time off, with approval status |
| `department-list` | read | Departments and their members |
| `department-create` | perform | Create a department |
| `department-people-add` | perform | Put people in one |
| `event-list` | read | What changed — the feed a sync reads |

## Things worth knowing

### `employee-create` does not hire anyone

It creates a record in the **onboarding** state: no job, no compensation, no tax
withholding, no bank details. None of that can be set here, and until it is, the
person cannot be paid. The call succeeds and returns somebody who looks created,
which is exactly why it says so — a workflow treating it as "hired" will find
payroll running without them.

**Self-onboarding is on by default.** Gusto then emails the employee and
collects their own address, tax forms and bank details — less work, and the only
version that keeps a Social Security number out of the workflow entirely.

### Terminated employees vanish rather than being marked

`employee-list` excludes them unless asked. That default is right for "who works
here" and wrong for almost every reconciliation: a sync that only reads this will
never learn that somebody left, because the leaver simply stops appearing.

Read it with `terminated: true` to find them — or read `event-list`, which
carries the termination event that made them disappear.

### Employees, contractors and their money are three separate collections

Contractors are not employees with a flag: different tax treatment, a separate
list, and a separate payment route (`contractor-payment-list`, individual
transactions in a date window, rather than a payroll run). A workflow totting up
spend has to read both and add them; neither includes the other.

### Compensation is three levels deep

An **employee** holds one or more **jobs**; a job holds a series of
**compensations**, each with an `effective_date`. A raise is a *new
compensation*, not an edit — which is why "what does this person earn" is a
question about the latest compensation on their primary job.

`payment_unit` (`Hour`, `Week`, `Month`, `Year`, `Paycheck`) is what makes the
rate meaningful: annualising without reading it is how `4000` becomes either a
good salary or a very bad one.

### `processed` is the field that decides what you may believe

An unprocessed payroll is a draft. Its totals move, its per-employee numbers are
a **projection** recalculated as hours and deductions change, and nobody has
been paid. Posting those to an accounting system as actuals produces a set of
books that quietly disagrees with the bank.

A processed payroll is final and carries `check_date` — when the money actually
lands, usually days after the period ended. And the date filters on
`payroll-list` work on the **pay period**, not the check date, so a run that
spans a month boundary files under the period.

### The deadline is the thing a scheduling workflow exists to beat

Each entry from `pay-period-list` carries a `payroll_deadline` — when hours,
bonuses, reimbursements and a new hire's first pay have to be in Gusto for that
run. Missing it does not fail loudly; the item lands in the next period instead.

### Pending time off is a plan, not a fact

`time-off-request-list`'s `status` separates them. A capacity or calendar
workflow that treats pending and approved alike books cover for leave nobody
takes; an approvals workflow wants exactly the pending ones.

## What this app deliberately does not do

Payroll is the integration where the damage from a wrong call is somebody not
being paid, being paid twice, or a legal filing being wrong. Each of these is a
narrowing of an API that would allow more:

- **No payroll submission.** Reading payrolls, per-employee breakdowns and
  deadlines is here; approving and submitting a run is not. A test asserts no
  action touches those routes.
- **No SSN and no bank details.** `employee-create` defaults to self-onboarding
  so Gusto collects both from the employee, and `employee-update` offers no
  `ssn` field even though the API accepts one. A test asserts neither ever
  reaches the wire.
- **Garnishments are read-only.** They are court orders — child support, tax
  levies — not settings, and changing how much of somebody's pay is withheld
  under a legal instrument is not something an automation should make easy.
- **Home addresses are read-only.** Changing where somebody lives changes their
  tax withholding.
- **Terminating requires an explicit confirmation**, and the two parameters that
  carry legal weight say why in their own hints: the effective date is the last
  day worked, and several US states require the final paycheck on or before it.

Also out of scope: benefits administration (a compliance surface of its own),
webhook subscription management (a host concern, not a workflow step), and the
Embedded Payroll API.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Gusto up — as opposed to one of its vendors? |
| `api-version` | dependency | Has the version this app pins been deprecated? |

`service` reads Gusto's Statuspage, which is unusual in what it publishes.
Its ~20 components mix three different kinds of thing:

| Group | Examples | How it is treated |
|---|---|---|
| Gusto's product | `API`, `Payroll, Benefits, HR` | **Decides the verdict** |
| Gusto's infrastructure vendors | `S3 West`, `Elastic Compute Cloud`, five Cloudflare components, `Database` | Reported, capped at `degraded` |
| Gusto's support channels | `Phone System`, `Chat System`, `Email System` | **Ignored** |

Rolling all of that up would make a Cloudflare CDN incident read as a payroll
outage and a busy support line read as an API failure. The infrastructure
components stay visible because "S3 West is degraded" is genuinely useful
context when writes start failing — but they are upstream of Gusto, not
authoritative about it.

`api-version` is the more unusual one, and it exists because Gusto answers the
question itself on every response. It reads the `deprecation` header (RFC 8594's
`@<epoch>` form) and reports:

- **`ok`** — no deprecation header: the pin is current;
- **`degraded`** — deprecated with a date ahead, and how many days are left;
- **`down`** — the sunset has passed, *or* Gusto served a different version than
  the one requested, which is what happens when a pin is no longer recognised.

It is a `dependency` check rather than a `service` one on purpose: nothing is
wrong with Gusto, something is about to be wrong with this app.
