# Mixpanel

Query product analytics from a workflow, and write events and user profiles into
it.

- **Categories** — analytics, marketing
- **Auth methods** — service-account
- **Actions** — 13
- **Egress allowlist** — `mixpanel.com`, `*.mixpanel.com` (nine hosts across
  three families — see below)
- **Website** — https://mixpanel.com
- **API docs** — https://docs.mixpanel.com/reference

Mixpanel publishes no single OpenAPI document, so paths come from its reference
documentation and the behaviour below was **measured against the live hosts on
2026-08-18**.

## The finding this app is built around: `/track` cannot fail

Mixpanel's best-known ingestion endpoint answers **HTTP 200 for everything** —
including a completely bogus project token:

```
POST api.mixpanel.com/track?verbose=1
[{"event":"test","properties":{"token":"bogustoken","distinct_id":"x"}}]
→ 200  {"error":null,"status":1}
```

The token is not validated at ingest. A workflow using `/track` therefore cannot
learn that its events are going nowhere: the call succeeds, the data does not
arrive, and nobody notices until a dashboard is empty. Only structural problems
are caught (`{"error":"event, missing","status":0}`), and even those come back
inside a `200`.

**So this app does not use `/track` at all.** `event-import` uses
`POST /import`, which:

- authenticates with the service account — a bogus one answers
  `{"code":401,"error":"Not a valid service account username"}`;
- validates every record with `strict=1` and names the ones it rejects;
- returns a real status code.

## `$insert_id` is the difference between a retry and a double-count

Mixpanel deduplicates on the tuple *(event, time, distinct_id, $insert_id)*.
That is the only thing standing between a retried workflow and double-counted
revenue, so **`event-import` refuses events without one** rather than letting
Mixpanel mint a fresh id per attempt.

It matters more than usual here because of how `strict=1` fails: a `400` still
imports the valid records and reports the rest in `failed_records`. A partial
failure has *already written part of the batch* — and the retry is safe only
because the ids are stable.

## Two credentials, and Mixpanel does not let you pick

| Surface | Credential |
|---|---|
| Query, raw export, event import | **Service account** (Basic) |
| Profile writes (`/engage`) | **Project token, inside the payload** |

Measured: `/engage` with a valid-shaped Basic credential *and* `project_id`
still answers `{"error":"$token, missing or empty","status":0}`. No header
substitutes for it.

An Action may never touch a credential — so the token is injected by the auth
**`sign` hook**, which is the one hook allowed to hold one and which receives the
request *body* as well as its headers. It stamps `$token` into `/engage`
payloads and nowhere else; a test asserts that `/import` bodies never get one.

The project token is therefore **optional**. Without it, every query, export and
import action works, and the two profile-writing actions fail immediately with a
message naming the missing field instead of calling an endpoint that cannot
succeed.

## Setup

1. Mixpanel → **Organization Settings → Service Accounts** → create one. The
   secret is shown once.
2. **Project Settings → Overview** for the project id. One service account can
   reach several projects, which is why every call names one.
3. Pick the **data residency region**. The wrong one does not redirect — it
   simply cannot find the project.
4. Add the **project token** only if you need to write profiles.

The connection test uses `GET /api/app/me`, which is the service account's own
identity route. It is precise — a bad credential answers
`{"status":"error","error":"Invalid service account credentials"}` — and, being
outside the Query API, **it does not spend one of the project's sixty queries an
hour**. It also reports the specific case where the account authenticates but
cannot reach the configured project.

## Three host families, three regions each

| Purpose | US | EU | India |
|---|---|---|---|
| Query (`/api/query/*`, `/api/app/*`) | `mixpanel.com` | `eu.mixpanel.com` | `in.mixpanel.com` |
| Ingestion (`/import`, `/engage`) | `api.mixpanel.com` | `api-eu.mixpanel.com` | `api-in.mixpanel.com` |
| Raw export (`/api/2.0/export`) | `data.mixpanel.com` | `data-eu.mixpanel.com` | `data-in.mixpanel.com` |

All nine were verified to answer. A project lives in exactly one region, so the
region is part of the credential — and the `service` health check watches only
that region's components.

## Sixty queries an hour

The single most important operational fact about this app. The Query API allows
**60 queries per hour and 5 concurrent, per project** — shared with the
company's dashboards and BI tools — and reports a breach as a bare `429` with
**no rate-limit headers of any kind**.

Design around it: query once and iterate over the result, never once per row of
a list. `insights-query` returning a whole saved report is one call;
`segmentation-query` per event is one call each.

The raw Export API has its own budget (60/hour, 3/second, 100 concurrent), and
ingestion is metered by volume (2 GB of uncompressed JSON per minute) rather than
by call.

## Actions

| Key | Type | Description |
|---|---|---|
| `insights-query` | read | Run a saved report and get its numbers |
| `segmentation-query` | read | Counts for one event, optionally broken down |
| `retention-query` | read | Cohorted retention |
| `event-name-list` | read | The event names this project has |
| `event-property-values` | read | What values a property actually takes |
| `lexicon-schema-list` | read | Documented event and property definitions |
| `profile-query` | search | Find people by expression or saved cohort |
| `cohort-list` | read | Saved cohorts and their ids |
| `activity-list` | read | One person's event stream |
| `event-import` | perform | Write events, deduplicated by `$insert_id` |
| `profile-update` | perform | Set, increment, append to or remove properties |
| `profile-delete` | perform | Delete profile records |
| `event-export` | read | Raw events as JSONL |

## Things worth knowing

### Start with the saved report

A report built in the Insights UI already encodes the events, breakdowns,
filters and date logic somebody in the company agreed on. `insights-query`
returns **the number the dashboard shows**, and keeps returning it when the
definition changes. Rebuilding the same logic out of `segmentation-query`
parameters puts a second definition of "active user" in a workflow, where nobody
will find it when the first one moves.

It is also why this app implements no Funnels endpoint: Mixpanel has put the
Funnels Query API into maintenance mode and recommends building the funnel as a
report and querying it here instead.

### Counting events is not counting people

`segmentation-query`'s `type` decides which: `general` counts occurrences,
`unique` counts people, `average` averages a property. Reporting a `general`
count as a user count is the most common way to overstate a number by an order
of magnitude, so the parameter is explicit rather than implicit.

The same split appears in `retention-query`'s `retention_type`: **birth**
retention counts somebody in week 3 only if they returned in week 3, while
**compounded** counts them if they returned in week 3 *or any week before*. Both
are legitimate; they are not comparable.

### The expression language is neither SQL nor JSON

`where` and `on` are Mixpanel's own segmentation expressions — property names
bracketed and quoted, `properties["plan"] == "pro" and properties["seats"] > 5`.
A bare property name is a syntax error, not a lookup. `event-property-values` is
the lookup that makes one writable: it usually reveals that `plan` contains
`pro`, `Pro`, `PRO` and an empty string, because it was set from three places
over two years.

### The export is JSONL, and its dates are UTC

`event-export` differs from everything else here three ways: it runs on its own
hosts, it answers **newline-delimited JSON** (so parsing the whole body as JSON
fails on the second line — the client reads it line by line), and **its dates
are UTC** while the query endpoints use the project's timezone. At a day
boundary the two disagree, which is exactly what makes a reconciliation off by
one day's events.

### Profile operations are not interchangeable

`$set` overwrites; `$set_once` writes only what is not already there (the right
one for "first seen at", which must not move); `$add` increments by a **delta**;
`$union` adds to a list without duplicating; `$append` duplicates; `$unset`
removes by name and takes an **array**, not an object.

Sending the new total with `$set` and the change with `$add` are both correct and
produce different answers. `profile-update` declares itself **not** idempotent
because two of its six operations are not.

`/engage` also answers `200` regardless, so `verbose=1` is always sent and a
`status: 0` is turned into an error rather than passed off as success.

### Deleting a profile does not delete the events

`profile-delete` removes the profile record and its properties. The user's
events stay in the project and keep appearing in reports. A GDPR erasure needs
Mixpanel's separate deletion API, and the action says so rather than being
mistaken for one.

### Paging profiles reuses a session id

`profile-query` pages with `page` plus the `session_id` Mixpanel returns on the
first response. Reusing it is what pins the result set — without it each page is
computed afresh and rows can appear twice or not at all. Paging also has a page
ceiling, because each page is a request and there are only sixty an hour.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is this project's region up, and for which capability? |
| `quota` | quota | Declared absent — see below |

`service` is **connection-scoped**, because the region is on the credential.
Mixpanel's status page is partitioned by region *and* by capability, which lines
up exactly with how this app splits:

| Component | Covers |
|---|---|
| `Application Availability (region)` | every `/api/query/*` action |
| `Ingestion API Availability (region)` | `event-import`, the profile writes |
| `Data Export` | `event-export` alone |

Those fail independently — a workflow that only queries is unharmed by an
ingestion outage — so **one being out is `degraded`**, and `down` is reserved
for both of the region's own components being out at once. An EU outage leaves a
US project green, and tests assert both directions.

`quota` is a **declared absence**. Verified: responses from
`mixpanel.com/api/query` carry `x-server-elapsed` and no `x-ratelimit-*` header
of any kind, and neither the Query API nor the app API publishes a usage
endpoint. Probing for headroom would mean spending one of the sixty to discover
how many remain. Instead the client turns the `429` into a message that names the
limit, so the first time a workflow hits it the error says why.

## What this app deliberately does not do

- **`/track`** — for the reason at the top.
- **The Funnels Query API** — in maintenance mode; Mixpanel recommends a saved
  report queried through `insights-query`.
- **JQL** — a deprecated custom query language.
- **The data-deletion (GDPR) API** — an asynchronous job queue with its own
  compliance semantics.
- **Group profiles** — they need a group key configured on the project before
  any of it means anything.
