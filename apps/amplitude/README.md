# Amplitude

Send events to Amplitude and query its analytics — segmentation, funnels,
retention, cohorts, user activity and chart results.

- **Categories** — analytics, marketing
- **Auth methods** — api-keys
- **Actions** — 15
- **Egress allowlist** — `api2.amplitude.com`, `api.eu.amplitude.com`,
  `amplitude.com`, `analytics.eu.amplitude.com`, `status.amplitude.com`
- **Website** — https://amplitude.com
- **API docs** — https://amplitude.com/docs/apis

Probed live against all four API hosts on 2026-08-18, with field semantics from
Amplitude's own HTTP V2 documentation.

## This is two products with two credentials and four hosts

Amplitude's API is not one surface. It is an **ingest** side and a **query**
side, and almost nothing is shared:

| | Ingest | Query |
| --- | --- | --- |
| US host | `api2.amplitude.com` | `amplitude.com` |
| EU host | `api.eu.amplitude.com` | `analytics.eu.amplitude.com` |
| Credential | the **API key**, in the request body | API key **and secret key**, HTTP Basic |
| Bad credential | `400 {"code":400,"error":"Invalid API key: …"}` | `403 {"error":{"metadata":{"details":"Invalid API Key"}}}` |

All four measured. And there is a third error shape: the `/identify` endpoint is
form-encoded and answers a bad key with the plain text `invalid_api_key`, no
JSON at all.

The API key is deliberately semi-public — it is compiled into mobile apps and
served in browser bundles — so it can only **write**. The secret key is what
reads. Using the API key alone against the query side returns `Invalid API Key`,
which is true and misleading: the key is fine, the *pair* is not. Every place
this app reports that message says so.

### One sign hook, three injection sites

Amplitude wants the credential in three different forms, and all three happen in
the auth hook so no action ever touches one:

1. **Query hosts** — `Authorization: Basic` of `apiKey:secretKey`.
2. **JSON ingest** (`/2/httpapi`, `/batch`) — `api_key` as a field *inside the
   JSON body*.
3. **Form ingest** (`/identify`, `/groupidentify`) — `api_key` as a form
   parameter.

`SignableRequest` exposes the body, which is what makes that possible. The
`index.ts` suite asserts no action file contains `api_key` or `secretKey`.

## Short ids are removed, not rejected

From Amplitude's documentation: user and device ids below **5 characters** are
*"removed from events"*.

Not an error. The event is accepted, ingested, counted — and attached to nobody.
A workflow forwarding numeric ids from another system (`42`, `1071`) produces a
stream of anonymous events, and the `200` response says `events_ingested: 1`.

Both ingest actions check before sending and refuse with the offending ids
named. `minIdLength` is the escape hatch, and it does two things at once: it
allows the short ids *and* sends `options.min_id_length` so Amplitude keeps them.

## A retry double-counts unless `insert_id` is stable

Deduplication is the only protection Amplitude offers — same `device_id` plus
`insert_id` within 7 days — and it keys on the id being **the same across
attempts**. A freshly generated UUID therefore achieves nothing: the retry
carries a different one and both events land.

So `event-track` and `event-batch` derive `insert_id` from a SHA-256 of the
event's own content, with sorted keys so property order does not change it.
Identical payload, identical id, deduplicated. A caller who genuinely wants two
identical events to both count supplies their own.

## A 400 is usually a partial success

The ingest side reports failures **by index**: `events_with_invalid_fields`,
`events_with_missing_fields`, `silenced_events`, `throttled_events`. Everything
not named was accepted.

So resending the whole batch is the wrong response — it double-sends everything
that already succeeded. Both ingest actions return `rejectedIndexes`, the union
of all four fields, so a caller can resend only those. A 429 works the same way:
Amplitude throttles **per user and per device** at 30 events per second, not per
project, so one runaway id throttles only itself and the rest of the batch went
through.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `event-track` | perform | Send events |
| `event-batch` | perform | Bulk-load events through the high-throughput queue |
| `user-identify` | perform | Set user properties without an event |
| `group-identify` | perform | Set properties on an account or workspace |
| `event-list` | read | The project's event taxonomy |
| `event-segmentation` | search | The query behind most charts |
| `funnel-query` | search | Conversion through a sequence |
| `retention-query` | search | Do people come back |
| `user-search` | search | Find a user by id or device |
| `user-activity` | read | One user's recent events |
| `cohort-list` | read | Behavioural cohorts |
| `annotation-list` | read | The vertical lines on charts |
| `annotation-create` | perform | Mark a release on every chart |
| `chart-query` | search | Run a chart somebody already built |
| `user-delete` | perform | GDPR erasure |

### Things the actions do that the API does not

- **`event-track` vs `event-batch`.** Identical payloads, different queues.
  `/batch` is throttled far more generously and takes longer to become
  queryable — so it is for backfills and bulk loads, and `/2/httpapi` is for
  events as they happen. Sending a historical import through the wrong one gets
  throttled; sending a live action through the other means it is not visible for
  minutes.
- **`event-segmentation` zips the parallel arrays.** The response is
  `data.series` (arrays of numbers) alongside `data.xValues` (the dates) with no
  labels inside the series — the *n*th number belongs to the *n*th date. Reading
  it any other way silently misattributes every value. The raw arrays come back
  too. Also worth knowing: `e` is a JSON object serialised into a *query
  parameter*, and `_active` and `_new` are pseudo-events that count active and
  new users without being events anybody sends.
- **`funnel-query` computes drop-off.** `stepFunction` is cumulative — step 3 is
  everyone who reached step 3, not everyone who went from 2 to 3. And the
  conversion window changes the answer more than any other parameter, defaulting
  to **7 days**.
- **`retention-query` returns the mode.** N-day, rolling and brackets turn the
  same data into three very different curves, so a retention number quoted
  without its mode is not a number.
- **`user-search` returns every match.** One person can be several
  `amplitude_id`s — one per device used before they signed in, merged only from
  the point of identification. Taking the first loses the rest.
- **`user-activity` insists on the numeric id.** A `user_id` here returns an
  empty result rather than an error, which is a quiet way to conclude somebody
  has no activity when they have plenty.
- **`event-list` counts hidden and deleted events.** Both stay in the list.
  Hidden ones keep collecting data and vanish from the UI's pickers, which makes
  this the only way to notice that the event a chart depends on was quietly
  tidied away.
- **`user-identify` reports which property operations were used.** A plain
  object is `$set` and rewrites the value every time; `$setOnce` is what keeps a
  first value such as a signup date. The distinction is invisible afterwards.
- **`annotation-create` validates the date format.** This one endpoint wants
  `YYYY-MM-DD`; every query endpoint wants `YYYYMMDD` without dashes. It also
  has **no uniqueness** — posting twice leaves two identical permanent lines on
  every chart in the project.
- **`user-delete` requires an acknowledgement.** Erasure is irreversible, and
  asynchronous: Amplitude takes **up to 30 days**, so the user remaining
  queryable afterwards is expected rather than a failure.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Which half of Amplitude is affected |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

`service` reads `status.amplitude.com`, and the useful thing about that page is
that it makes the same split this app does: **Data Reception** is the ingest
side, **Web Reporting** and **Data Processing** are the query side, and they
fail independently. A workflow that only sends events is unaffected by a
reporting outage, and one that only reads is unaffected by an ingest outage — so
the check names which half rather than rolling them together.

One detail worth recording: component names repeat across product groups
("Web Application" appears three times), so the component keys are
group-qualified. A name-only key would silently drop two of them.

`quota` is a declared absence. No response from any of the four hosts carries
rate-limit headers — verified by reading the full headers from each. Limits
exist and differ by side: ingest is throttled per user and per device at 30
events per second, and a 429 there is a *partial* failure naming the throttled
events by index; query is **cost-based** rather than request-based, so an
expensive segmentation over a wide window consumes more allowance than a narrow
one. Neither publishes what is left.

## Icon

`assets/icon.png` (180×180), downloaded verbatim from
`https://amplitude.com/nextjs-public/favicon/apple-touch-icon.png` on
2026-08-18 — Amplitude's own site. Checked with `_tools/icon-legibility.ts`.

## Tests

161 assertions across 20 files: one per action, one per auth method, one for the
live health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook, which here means **no action may contain `api_key` or `secretKey`** —
plus that both ingest actions keep their id-length guard and derive insert ids
by default, and that nothing logs an event, a property or an identifier.
