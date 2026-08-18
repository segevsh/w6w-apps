# Ashby

Work a hiring pipeline: find and create candidates, move applications through
stages, read interviews, feedback and offers, and sync all of it incrementally.

- **Categories** — hr, productivity
- **Auth methods** — api-key
- **Actions** — 27
- **Egress allowlist** — `api.ashbyhq.com` (the `service` health check adds
  `status.ashbyhq.com`)
- **Website** — https://www.ashbyhq.com
- **API docs** — https://developers.ashbyhq.com/reference/introduction ·
  per-endpoint OpenAPI at `developers.ashbyhq.com/reference/<endpoint>.md`,
  index at `developers.ashbyhq.com/llms.txt`

Every endpoint this app calls was checked against those documents on
2026-08-18.

## Setup

### API Key

Ashby → **Admin → API Keys**. It is sent as HTTP Basic with **the key as the
username and an empty password** — a trailing colon with nothing after it.

**Grant the modules your workflow needs.** Ashby keys are not all-or-nothing:
permissions are per module — Jobs, Candidates, Emails, Sourcing, Interviews,
Hiring Process, Organization, Offers, API Keys, Approvals, Reports, Notetaker,
Audit Logs — with read and write granted separately.

That means **a key can authenticate perfectly and be refused by every action a
workflow performs**. The connection test therefore reads the key's own scopes
back and reports them, and the `permissions` health check keeps watching them.

Two permissions are **off by default** and their absence looks like missing data
rather than a permission problem:

- access to **confidential jobs and projects** — a job visible in the UI and
  absent from `job-list` is usually this;
- access to **non-offer private fields** — needed to write a private note.

## Three conventions that decide how anything here works

### 1. An error arrives as `200 OK`

This is the one to internalise. Ashby's own words: *"What would be `4XX` errors
will return `200` with `success` being `false`."*

```json
{"success": false,
 "errorInfo": {"code": "application_not_found",
               "message": "Application not found - are you lacking permissions…",
               "requestId": "01JSJ8FEK5ZN4XQBZP7DBKK7ZC"}}
```

A client that branches on the HTTP status reports every business failure — a
missing candidate, a rejected stage move, a permission the key lacks — as a
**success**, and hands the next step an empty result. This app checks `success`
first and the status second, and carries the `requestId` into the error message
because that is what Ashby support asks for.

The mirror image also exists: `{"success": true, …, "warnings": [...]}` means
the request mostly worked. Dropping those is how a partially-applied write looks
clean, so they are logged.

### 2. Everything is POST, including reads

`POST https://api.ashbyhq.com/<resource>.<verb>` with a JSON body. No query
strings, no GETs. `Accept: application/json; version=1` pins the response shape.

### 3. The verb in the name says what you get

| Verb | Meaning |
|---|---|
| `.info` | One record |
| `.list` | Every record, paginated, for syncing |
| `.search` | Matches for a lookup — **not paginated**, capped |
| `.<action>` | Does something, returns the updated record |

`.list` and `.search` look interchangeable and are not. "Do we already know
ada@example.com" is `candidate-search` — one call. Answering it with
`candidate-list` walks thousands of records for a yes/no.

## Incremental sync, and its one catch

Most `.list` endpoints accept a **`syncToken`** from the previous run and return
only what changed since. That is the difference between a nightly job that
exports an entire ATS and one that moves a handful of records.

**Ashby sends the token on the last page only.** So a run that stops early —
because a limit was reached, or the page ceiling hit — comes back with **no
token**, and the next run has to sync everything again. This app does not hide
that: `syncToken` is returned when the walk genuinely finished and `undefined`
when it did not, with `moreDataAvailable` saying which.

> **`candidate-note-list` accepts a `syncToken` and ignores it.** Ashby's own
> schema says it is *"accepted for backward compatibility"* and the endpoint has
> no incremental sync — so a workflow passing a token there is fetching
> everything, every time, while believing otherwise. This app deliberately does
> not offer the parameter.

## Two time formats, in the same API

| Where | Format |
|---|---|
| **Filters** — `createdAfter`, `createdBefore`, `openedAfter`, `closedAfter` | **Unix milliseconds** |
| **Values you set** — `createdAt` on a candidate, note or application | **ISO date string** |

An ISO string in a filter is not rejected; it is coerced, and the filter
silently matches nothing or everything. Every filter param here takes a date and
is converted; every value param passes through untouched.

## Actions

| Key | Type | Description |
|---|---|---|
| `candidate-search` | search | **"Do we know this person"** — one call, by email |
| `candidate-list` | read | Walk every candidate, or only what changed |
| `candidate-get` | read | One candidate, by Ashby id or your own |
| `candidate-create` | perform | Add a person — **does not deduplicate** |
| `candidate-update` | perform | Correct details; social links **replace** |
| `candidate-note-create` | perform | How an automation talks to the recruiter |
| `candidate-note-list` | read | Their notes |
| `application-list` | read | **The pipeline** — filter by status |
| `application-get` | read | One application, by its id or a form id |
| `application-change-stage` | perform | **Advance or reject** somebody |
| `application-update` | perform | Source and credit — what reports are built on |
| `application-feedback-list` | read | Scorecards, with labels resolved |
| `job-list` | read | The internal roles |
| `job-get` | read | One role, with its openings |
| `job-posting-list` | read | What the careers page shows |
| `job-posting-get` | read | One posting's description and public compensation |
| `interview-schedule-list` | read | What has been booked |
| `interview-event-list` | read | The sessions inside one booking |
| `interview-stage-list` | read | Stage names → ids, and which ones reject |
| `offer-list` | read | Offers and their **three** statuses |
| `offer-get` | read | One offer, terms optional |
| `user-list` | read | Ashby users, for attribution and matching |
| `department-list` | read | Departments (hierarchical) |
| `location-list` | read | Locations, with regions |
| `source-list` | read | Where candidates come from |
| `archive-reason-list` | read | Why they get rejected |
| `api-key-info` | read | What this key may actually do |

## Six things that go wrong quietly

### 1. Creating a candidate twice splits their history

Ashby does **not** deduplicate on create. Two calls with the same email produce
two records, and from then on the interviews are on one and the offer on the
other. Merging is manual work in the app.

The correct shape is `candidate-search` by email, then `candidate-create` only
if nothing came back.

### 2. A Job is not a Job Posting

A **job** is the internal role — hiring team, interview plan, openings,
applications. A **job posting** is a public advertisement for it, and one job
can have several across different boards, or none. "What are we hiring for" is
`job-list`; "what does our careers page show" is `job-posting-list`.

`job-posting-list` has three filters that quietly change what "all postings"
means: `listedOnly` (excludes published-but-unindexed postings, usually
confidential searches), `includeUnpublishedJobPostings` (adds drafts, which must
never reach a public page), and `jobBoardId` (an internal board has different
postings from the external one).

Its `location` and `department` filters match **by name, case-sensitively** —
"berlin" returns nothing and looks like an empty result rather than a typo.

### 3. Moving to an archived stage is a rejection

`application-change-stage` advances *or* rejects depending on the destination
stage's `type`. A workflow picking a stage by name can reject a candidate while
believing it advanced them, so `interview-stage-list` separates the archive
stages out explicitly.

Archiving **requires** an `archiveReasonId` — Ashby will not record a rejection
as "no reason given". Those reasons are what every funnel report is grouped by,
so a workflow that always passes the same generic one quietly destroys the
analysis it was meant to feed. `archive-reason-list` has the real ones.

`archiveEmail` sends the candidate a rejection. It is omitted unless explicitly
supplied, because a bulk run that accidentally emails everybody is not
recoverable.

### 4. An offer has three independent statuses

- **`offerStatus`** — where it is in *your* process: drafted, sent, retracted.
- **`acceptanceStatus`** — what the **candidate** did.
- **`approvalStatus`** — whether the latest version cleared internal approval.

An offer can be approved, never sent, and therefore neither accepted nor
declined. Reading one for another is the usual cause of a report claiming hires
that did not happen.

### 5. Interview feedback comes back as values, not labels

Each submission is a `formDefinition` plus `submittedValues` keyed by field
path, because every organisation designs its own scorecards. **Selections are
the stored value, not the displayed label** — `"hire"`, not `"Hire"` — so a
workflow matching on what it sees in the Ashby UI matches nothing.
`application-feedback-list` resolves the labels from the form definition and
returns both.

### 6. `sendNotifications` defaults differently here

Ashby defaults it to **on**. `candidate-update` and `candidate-note-create`
default it to **off**, because the workflow case is usually a bulk correction —
and a hundred corrections should not mean a hundred emails to everyone watching.
Turn it on for the single note that a human genuinely needs to see.

## Personal data

This app handles candidates, interview feedback and offers — the most sensitive
records most companies hold about people who do not work there, many of whom
have not told their employer they are looking.

Nothing personal is logged. Actions log counts and ids: `candidate-search` logs
how many matched, `candidate-create` logs the id it made and not the name,
`candidate-note-create` logs the note's id and not its text, `offer-list` logs a
count and no compensation, and `offer-get` logs nothing at all. A test asserts
no `ctx.log` call carries an email, name, note or salary.

Nothing here deletes or anonymizes anybody either — Ashby has those endpoints,
and destroying a hiring record is not a thing a workflow should do by accident.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Ashby up — as opposed to a vendor it depends on? |
| `permissions` | dependency | What can **this key** actually do? |
| `quota` | quota | Declared absence — see below |

`service` reads `status.ashbyhq.com`, and makes a distinction the page itself
does not. Ashby lists its own services — `Ashby API`, `Job Post API`,
`Reports API`, `Recruiting`, `Scheduling`, `Hosted Job Boards` — alongside the
vendors it integrates with: `Google`, `Slack`, `Zoom`, `SendGrid API v3`,
`Office 365`, `AWS`, `Dropbox Sign`, `Microsoft 365`. A roll-up over everything
would mark Ashby **down because Zoom is having an incident**, which says nothing
about whether this app's calls will work. Third-party components are reported
with their own states and simply do not count towards the verdict.

`permissions` is the check worth having and the one no credential test can
replace. A read-only key authenticates flawlessly and is refused by every write,
so this reads `apiKey.info` and reports the granted scopes — including *"all
read-only"* as a fact rather than a surprise at 2am. A key that cannot read its
own permissions (no `apiKeysRead`) reports `unknown` with that reason, because a
narrow key is working as intended; a key with **no** scopes at all is `down`.

`quota` is a **declared absence**. Ashby publishes a limit for the **report**
endpoints only — `report.generate` and `report.synchronous` share 15 requests
per minute per organization and at most 3 concurrent operations, with polling
exempt — and this app implements neither. No limit is published for candidates,
applications, jobs, interviews or offers, no successful response carries an
`X-RateLimit-*` header, and there is no usage endpoint. A probe could only ever
answer `unknown`, at the cost of a request per interval.

## What this app deliberately does not do

- **Delete or anonymize.** `candidate.anonymize`, `application.delete` and
  friends exist and are irreversible.
- **Submit application forms.** `applicationForm.submit` is what a custom
  careers page calls from a browser with a file upload; a workflow's job starts
  after that, and `application-get` takes the form id it returns.
- **Upload résumés or files.** They move bytes the sandbox cannot produce.
- **The assessment partner endpoints.** Those are implemented *by* a partner and
  called *by* Ashby — the opposite direction from this app.
- **Reports.** `report.generate` is a beta two-step poll with its own rate limit
  whose large results arrive Brotli-encoded from S3; it deserves its own design
  rather than a thin wrapper.
- **Webhooks.** Configuring Ashby's own webhooks is a platform concern, and the
  `.list` endpoints' sync tokens cover the same ground resumably.

## Errors

A refusal reads as `Ashby refused <endpoint>: <message> (<code>) [requestId …]`
— the request id included because it is the first thing Ashby support asks for.
Transport failures keep their own meaning: `401` means no key arrived, and `403`
means the key is deactivated or lacks that endpoint's module permission, which
is granted in the Ashby app rather than here.
