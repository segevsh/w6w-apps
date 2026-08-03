# Jobber

Field-service management for home-service businesses — clients, properties, work requests, quotes,
jobs, visits and invoices — on the **Jobber GraphQL API**.

- **Categories** — calendar, crm, finance
- **Auth methods** — oauth2 (the only one Jobber offers)
- **Actions** — 28
- **Egress allowlist** — `api.getjobber.com` (the `service` health hook additionally reaches
  `www.jobberstatus.net`)
- **API version** — `X-JOBBER-GRAPHQL-VERSION: 2025-04-16`, pinned
- **Website** — https://www.getjobber.com/
- **API docs** — https://developer.getjobber.com/docs/

Jobber runs the office side of a plumbing, landscaping, HVAC or cleaning business: the request comes
in, becomes a quote, the quote becomes a job, the job is made of visits, and completed visits become
an invoice. That chain is the product, and it is the chain this app models. Everything else Jobber
does — payments, timesheets, job costing, job forms — hangs off it and is reachable through
`graphql-query`.

> Every field name, argument name, enum value and nullability claim below was transcribed from
> **Jobber's live schema**, not from the documentation. Jobber's GraphQL endpoint answers
> introspection without a credential, so the 3,651-type schema was pulled directly on 2026-08-03 and
> every query and mutation in this app was then re-sent to the live endpoint and confirmed to pass
> Jobber's own document validation. That matters, because the docs have drifted — see
> [Where the docs and the schema disagree](#where-the-docs-and-the-schema-disagree).

## The one thing most likely to break a workflow

### A failed Jobber request returns HTTP 200

This is not an edge case. It is the normal way Jobber reports failure, and it is the single most
important thing to understand before writing a workflow against this app.

**Verified on the wire, 2026-08-03.** An unauthenticated `POST https://api.getjobber.com/api/graphql`
with the body `{"query": "{ account { name } }"}`:

```
HTTP/2 200
content-type: application/json; charset=utf-8

{"errors":[{"message":"The field account on an object of type Query was hidden because you are
 unauthenticated","locations":[{"line":1,"column":3}],"path":["account"],
 "extensions":{"code":"UNAUTHENTICATED"}}],"data":{"account":null}}
```

Note the shape: **200 OK**, a populated `data` key, and the actual failure sitting in a sibling
array. `res.ok` is `true`. `data` is not undefined. Code that checks only the status code reads that
as a successful call returning a null account.

There are **three** independent failure channels, and they are genuinely independent:

| # | Channel | HTTP | What it means | Handled by |
|---|---------|------|---------------|------------|
| 1 | HTTP status | 401, 429, 5xx | Dead token; the DDoS limiter; Jobber itself down | `JobberClient.send` |
| 2 | `errors[]` beside `data` | **200** | Unauthenticated, unauthorised, bad argument, `THROTTLED` | `JobberClient.send` |
| 3 | `userErrors[]` inside a mutation payload | **200**, and no `errors[]` | A business rule said no | `unwrap` |

Channel 3 is the quiet one. Every Jobber mutation returns a payload shaped like this:

```jsonc
{ "data": { "clientCreate": {
    "client": null,
    "userErrors": [{ "message": "First name can't be blank", "path": ["input", "firstName"] }]
} } }
```

HTTP 200. No `errors[]`. A well-formed body. The record is simply `null` and the reason is in a
sibling array that a caller has to have asked for in the first place — `userErrors` is a field you
select, not something Jobber volunteers.

**This app closes all three.** `lib/client.ts` raises on channels 1 and 2; every mutation action
selects `userErrors { message path }` and routes its result through `unwrap`, which raises on channel
3. `tests/index.test.ts` enforces both halves in source — a mutation that forgets either fails the
build, not production.

**The one exception is `graphql-query`.** It cannot check `userErrors`, because only the caller knows
which field of `data` is the payload. A mutation written there must select and check `userErrors`
itself. This is stated on the action and repeated here because it is the only place in the app where
the burden moves to the workflow author.

## Other conventions this app encodes

### The version header is mandatory, and a stale pin fails *open*

Every request carries `X-JOBBER-GRAPHQL-VERSION`. Jobber: "Specifying a version in the header is
required for all apps." This app pins **`2025-04-16`** — the newest dated release in Jobber's
changelog as of 2026-08-03, and the version Jobber's own `curl` examples send.

The reason to care about maintaining that pin is the failure mode, which is not the one you would
expect. A version is supported "for a minimum of 12 months" and reachable "for up to 18 months from
their release date". After that, Jobber does **not** reject the request:

> Once an API version is removed, it becomes inaccessible, and any attempts to use that version will
> be automatically upgraded to the next supported version (oldest supported version).

So a stale pin degrades into a silent schema change, not a loud error. Jobber's early warning is
`extensions.versioning.warning`, which appears on responses while a version is approaching or past
end of support. `lib/client.ts` reads it and emits a `warn` log line rather than discarding it.

Version-to-version churn is real, not theoretical: `requests(sort:)` changed from
`RequestsSortInput` to `[RequestsSortInput!]` in 2024-11-12, and `JobCreateAttributes.jobFormIds`
changed from `[ID!]` to `[EncodedId!]` in the pinned version itself.

### Ids are `EncodedId` strings, never integers

Every object's `id` is a base64 string. `Z2lkOi8vSm9iYmVyL0NsaWVudC8xMTkxOTUzNDA` decodes to
`gid://Jobber/Client/119195340`. An id returned by one query is the argument another takes verbatim,
and a numeric-looking id is a bug in whatever produced it.

### The budget is query *cost*, and every connection here is bounded

Jobber runs two limiters. Only one of them is readable, and it is the one that usually binds.

**GraphQL query cost** — a leaky bucket, per app/account pair: 10,000 points at rest, refilling at
500 points per second. One point per field, **except** that a connection costs `first` (or `last`)
× the number of fields inside it. And:

> If a `first`, or `last` argument is not supplied to a connection field, the API will have to assume
> the maximum number of fields will be returned when calculating the `requestedQueryCost`. All
> connection fields are configured to return a maximum of 100 nodes when no arguments are supplied.

That is why every connection in this app — including the nested ones inside `job-get`, `quote-get`,
`invoice-get` and `client-get` — carries an explicit `first`. `job-get` as written costs roughly 550
points; the same query with its four bounds removed would be *budgeted* at close to ten times that
against a 10,000-point ceiling, whether or not the data was there. `tests/index.test.ts` fails the
build on an unbounded connection in any action.

Over budget, Jobber answers HTTP **200** with `errors[{ extensions: { code: "THROTTLED" } }]`.
`lib/client.ts` names that case specifically and reports how many points were actually available,
because it is the one GraphQL error a workflow author can act on — wait, then retry — rather than
fix.

**Rack::Attack DDoS protection** — 2,500 requests per 5 minutes per app/account, answering HTTP 429.
Nothing in a response exposes how much of that bucket is spent, so this app does not report it. See
[Health checks](#health-checks).

### Pagination is Relay cursors, and `totalCount` is a trap

Collections take `first` + `after` and return `pageInfo { hasNextPage endCursor }`. Every list
action here surfaces both. Loop on `hasNextPage`, not on an empty `nodes` array — a filtered page
can be empty while more pages remain.

`totalCount` exists on every connection and is deliberately never selected. Jobber's own schema
description: *"Please use with caution. Using totalCount raises the likelyhood you will be
throttled"* [sic].

### A quote is priced for a **property**, not just a client

`quoteCreate` requires `propertyId` as well as `clientId`, both non-null. One client can own several
serviced locations, and there is no "use the client's default property" spelling. `property-list`,
filtered by client, is where that id comes from. This is the most common way a first Jobber
integration fails.

### Jobber's naming is not internally consistent, and this app transcribes rather than smooths

Normalising these would hide real differences and break the moment a workflow author cross-references
the schema:

| Inconsistency | Detail |
|---|---|
| Mutation argument names | `clientCreate(input:)` and `requestCreate(input:)` but `quoteCreate(attributes:)` and `quoteEdit(attributes:)` |
| Id argument names | `clientArchive(clientId:)`, `invoiceEdit(invoiceId:)` — but `quoteApprove(id:)` and `invoiceMarkAsSent(id:)` |
| Status enum casing | Quote, job, invoice and request statuses are lower-case (`awaiting_response`, `past_due`); **visit** statuses are UPPER-case (`UNSCHEDULED`, `COMPLETED`) |
| Sort argument arity | `clients(sort: ClientsSortInput)` is a single object; `jobs`, `quotes`, `invoices`, `requests` and `visits` all take a **list** |
| One concept, three names | The query is `products`, the type is `ProductOrService`, the mutations are `productsAndServices*` |
| Two enums for one idea | The products **filter** takes `[WorkItemCategoryTypeEnum!]`; the **field** on the record is `ProductsAndServicesCategory` |

`JobStatusTypeEnum` deserves its own note: it is not a lifecycle. It mixes true states (`active`,
`archived`, `on_hold`) with scheduling views (`today`, `upcoming`, `late`, `unscheduled`) and work
queues (`requires_invoicing`, `action_required`). A job that is active and scheduled for today
matches several, and the filter takes exactly one — so "status" means "which dashboard bucket", not
"what state is this in".

### Visit schedules are wall-clock, not instants

`visitCreate` does not take an ISO timestamp. Jobber's `LocalDateTimeAttributes` splits the schedule
into `date` (non-null), `time` (optional) and `timezone` (non-null), and that shape is deliberate: a
service appointment is "Tuesday at 9am at the property", which is a wall-clock fact. Collapsing it
into UTC is how an appointment ends up an hour out across a DST boundary.

Two consequences: **omitting the time makes it an all-day visit** (that is the feature, not an
accident), and **a date with no timezone is rejected locally**, before the call, rather than sent for
Jobber to reject opaquely. Omitting the date entirely creates an *unscheduled* visit — a real Jobber
concept, work attached to a job with no slot yet. Unscheduled visits have `startAt` and `endAt` both
null, so they match no date-window filter.

## Actions

### Clients

| Action | Operation | Notes |
|---|---|---|
| `client-list` | `clients` | Search, tags, lead/company/archived flags, updated-at window |
| `client-get` | `client(id:)` | With the first 10 serviced properties |
| `client-create` | `clientCreate` | Optional primary email, phone and first property in one call |
| `client-edit` | `clientEdit` | See below — the edit input is not a mirror of create |
| `client-archive` | `clientArchive` | Reversible. `clientDelete` is deliberately not shipped |

**`ClientEditInput` is not `ClientCreateInput`.** Contact details are edited through `*ToAdd` /
`*ToEdit` / `*ToDelete` lists — there is no `emails:` field on the edit input at all, and sending one
is a schema error rather than a silent no-op. `client-edit` exposes the append and tag-delete halves;
editing or removing an existing email or phone needs that record's own EncodedId, which only
`client-get` can supply, so it is left to `graphql-query` rather than modelled as a form field whose
value requires a second lookup.

### Properties

| Action | Operation | Notes |
|---|---|---|
| `property-list` | `properties` | The source of the `propertyId` quotes and jobs require |
| `property-create` | `propertyCreate(clientId:, input:)` | Client is an argument; the input wraps a **list** |

### Requests

| Action | Operation | Notes |
|---|---|---|
| `request-list` | `requests` | `sort` is a list here — changed type in 2024-11-12 |
| `request-get` | `request(id:)` | With the assessment and the quotes/jobs it produced |
| `request-create` | `requestCreate` | Defaults to the client's last-used property |

`request-create` does **not** expose `RequestCreateInput.source`. It names the channel a request
arrived through and feeds Jobber's attribution reporting; letting a workflow claim an arbitrary
origin would corrupt exactly what the field exists to measure.

### Quotes

| Action | Operation | Notes |
|---|---|---|
| `quote-list` | `quotes` | Client, status, salesperson, created-at window |
| `quote-get` | `quote(id:)` | With up to 50 line items and any jobs converted from it |
| `quote-create` | `quoteCreate(attributes:)` | Needs `clientId`, `propertyId` **and** ≥1 line item |
| `quote-approve` | `quoteApprove(id:)` | Approval on the client's behalf. Does not create the job |

`quote-create` forces `saveToProductsAndServices: false` on every line item rather than exposing it.
It decides whether an ad-hoc line becomes a permanent entry in the account's price book, and a
workflow quietly growing a customer's catalogue on every run is a side effect nobody asked for.
`sendForApproval` maps to `transitionQuoteTo: AWAITING_RESPONSE` — the *only* legal transition on
create, and it does not email the quote.

### Jobs

| Action | Operation | Notes |
|---|---|---|
| `job-list` | `jobs` | Dashboard bucket, type, scheduling window, assignee, id batch |
| `job-get` | `job(id:)` | Line items, visits, originating quote, invoices — all bounded |
| `job-create-from-quote` | `jobCreateFromQuote` | Requires scheduling and invoicing terms |

`job-create-from-quote` asks for more configuration than feels comfortable, and that is Jobber's
shape rather than a choice here. `JobCreateFromQuoteAttributes` makes both `scheduling` and
`invoicing` non-null, on the stated grounds that they are the details "which cannot be inferred from
the quote" — client, property, line items and totals all carry across; when the work happens and how
it is billed do not. Four fields are non-null inside them (`createVisits`, `notifyTeam`,
`invoicingType`, `invoicingSchedule`), so all four carry defaults here (a fixed-price job invoiced on
completion, visits created, team notified) rather than being left to fail at Jobber.

`scheduling.recurrence` is deliberately absent. It is an `ICalendarRule` string that must be prefixed
`RRULE:`, and a malformed one silently produces the wrong visit schedule for months — not a failure
mode to hand a form field. Recurring jobs go through `graphql-query`.

### Visits

| Action | Operation | Notes |
|---|---|---|
| `visit-list` | `visits` | Job ids, assignee, status, start window, IANA timezone |
| `visit-create` | `visitCreate(jobId:, input:)` | Wall-clock schedule — see above |
| `visit-complete` | `visitComplete` | Defaults to now; backdatable |

`visit-list`'s `timezone` argument is not cosmetic: `Visit.visitStatus` takes a timezone, and the
whole `TODAY` / `LATE` / `UPCOMING` vocabulary is relative to a day boundary. Passing
`America/Denver` makes "today" mean the account's today rather than UTC's.

`visitUncomplete` exists and is not shipped — undoing completion unwinds billing state and should be
a decision, not a retry.

### Invoices

| Action | Operation | Notes |
|---|---|---|
| `invoice-list` | `invoices` | `past_due` is a Jobber-computed status, not a date comparison |
| `invoice-get` | `invoice(id:)` | With line items and payment records |
| `invoice-create-from-job` | `invoiceCreateFromJob` | Two arguments, not the general `invoiceCreate` |
| `invoice-mark-as-sent` | `invoiceMarkAsSent(id:)` | Records it as sent. **Does not email anyone** |

**Why `invoiceCreateFromJob` and not `invoiceCreate`.** `InvoiceCreateInput` makes `origin`,
`dueDetails`, `tax` and `clientId` all non-null and expects the caller to assemble the line items,
tax method and due terms — i.e. to re-derive from scratch what Jobber already knows from the job.
`invoiceCreateFromJob` takes two arguments and lets Jobber carry across the client, property,
uninvoiced line items and the account's tax and payment-term defaults. For "bill this job", the
second is both simpler and more likely to be right.

**`origin` is pinned to `INTEGRATIONS`, not exposed.** `InvoiceOrigin` is a 13-value enum and almost
every value is a claim about where *in Jobber's own UI* the invoice was raised (`NEW_MOBILE`,
`JOB_CLOSE_JOBBER_ONLINE`, `QUOTE_CONVERT_MOBILE`, `BATCH_INVOICE`). It feeds Jobber's reporting on
how their customers work. There is exactly one honest value for an invoice created by a third-party
integration; offering the enum as a dropdown would let a workflow tell Jobber a small lie on every
run.

**Nothing in this app emails a client.** `invoice-mark-as-sent` records that an invoice was sent —
it takes it out of draft, which starts the payment terms — and sends no mail. Jobber has mutations
that do send mail; none of them are here. A workflow that silently emails customers is a different
and much larger commitment than one that updates records.

### Reference data and the escape hatch

| Action | Operation | Notes |
|---|---|---|
| `product-list` | `products` | The price book. `showInactive` defaults to Jobber's own `false` |
| `user-list` | `users` | `filter` is **non-null** and requires a status — no "all users" call |
| `account-get` | `account` | Parameterless; also the App's `credential` health probe |
| `graphql-query` | anything | See below |

`User.name` is an object (`{ first, last, full }`), not a string, and `User.email` is
`UserEmail` (`{ raw, isValid }`) rather than a plain address. A workflow reading `user.name` gets an
object and wants `user.name.full`.

**`graphql-query`** exists for the same reason `apps/odoo` ships `call-method`: Jobber's schema has
~3,650 types, the 27 actions above cover the field-service spine, and timesheets, expenses, job
costing, payouts, custom fields, job forms, tags, payment records and the whole Jobber Payments
subsystem are all reachable and none are modelled. Enumerating them in a manifest is a losing race
against a schema that ships breaking changes on a dated cadence.

It carries the same guarantees as every other action — `ctx.fetch`, no credential access, the pinned
version header, and an HTTP-200-with-`errors[]` still throws — and one fewer: it cannot check
`userErrors`. It returns `{ data, extensions }` so the cost meter and any version warning survive.

## Authentication

**OAuth 2.0 authorization code is the only option, and that was checked rather than assumed.**
Jobber's App Authorization page opens with the alternative stated as an explicit non-option:
"rather than using a static API key, a company admin for each Jobber account must explicitly
authorize your app". There is no personal access token, no account API key and no basic-auth
fallback anywhere in the Developer Center — including for the "Custom integrations" path that exists
precisely for a single account, which still registers an app and still runs this flow.

| | |
|---|---|
| Authorize | `https://api.getjobber.com/api/oauth/authorize` |
| Token / refresh | `https://api.getjobber.com/api/oauth/token` |
| PKCE | Yes — Jobber recommends it and supports **only** `S256` |
| Access token lifetime | 60 minutes (`expires_in: 3600`) |
| Refresh token | Long-lived, **rotating** |

**Scopes are not sent in the authorization request**, which is worth stating because every other
OAuth app in this pack sends them. Jobber configures scopes *on the app* in the Developer Center:
"They are configured when creating your app in the Developer Center and are displayed to users on
the OAuth authorization page." Jobber's own documented authorization URL carries `response_type`,
`client_id`, `redirect_uri`, `state`, `code_challenge` and `code_challenge_method` — and no `scope`.
Declaring scopes here would render a list in the connect UI that this app cannot actually request.

Two things a host must get right:

- **Refresh tokens rotate.** "if Refresh Token Rotation is enabled, a new refresh token" comes back
  on every refresh, and "Always store the returned refresh token, overwriting the previous one."
  A host that replays the original works until rotation is switched on, then stops.
- **The account id must be stored.** `afterConnect` fetches `{ account { id name industry
  countryCode } }` because Jobber asks for it: the `APP_DISCONNECT` webhook identifies the *account*,
  so without it there is no way to know which Connection a disconnect refers to.

A refresh token also dies when the admin disconnects the app, when the account churns or downgrades,
when the client secret is regenerated, or after a scope change. All surface as a failing `test`, and
the only cure is reconnecting.

`tests/auth/oauth2.test.ts` pins the HTTP-200-with-`UNAUTHENTICATED` case specifically: a `test` hook
that checked only `res.ok` would report a dead credential as live.

## Health checks

### `service` — Jobber platform status

Atlassian Statuspage at **`www.jobberstatus.net`**, read once per app (not per Connection),
unauthenticated and unsigned. The probe is `GET /api/v2/summary.json`, which returns the rollup
indicator *and* the per-component breakdown in one request.

The breakdown is the reason for `summary.json` over `status.json`. Jobber reports **"Web Application
(Jobber Online)"**, **"API & Mobile Application (Jobber App)"**, "Jobber Payments", "Email Services",
"Text Messaging Services", "QuickBooks Online Integration", "Web Application Subscriptions", "Phone
Support" and "Chat Support" separately. A workflow that only calls the API is unaffected by a chat-
support outage, and a component-level answer can say so instead of greying out the whole App.

The status host is **not** on the app's main egress allowlist — an action has no business calling it.
The allowlist is widened for this one hook, which the spec permits precisely because the posture is
unsigned: a signed request must never reach a third-party status host.

A status page that itself fails reports `unknown`, never `down` — it says nothing about Jobber, and
calling that an outage would be a lie. So does a 200 carrying the wrong document: the probe requires
`status.indicator` to be a string before it will map anything, because an HTML catch-all also answers
200.

**Severity is left at the kind default, `degraded`.** That is a deliberate decision, not an
oversight. The state this check reports is Statuspage's account-wide rollup, which is true for every
Jobber tenant equally — there is nothing tenant-conditional about "Jobber Online is down", so
demoting it to `informational` would hide a real, universal outage. Some of the *components* are
partly tenant-conditional (not every account uses Jobber Payments or the QuickBooks integration), but
components are reported as detail beside the verdict, never as the verdict.

#### Verifying the status endpoint is real, two ways

A JSON-shaped path returning 200 is not proof of an API. Both checks were run on 2026-08-03.

**(a) A deliberately bogus sibling on the same host.**

| Path | Result |
|---|---|
| `https://www.jobberstatus.net/api/v2/summary.json` | 200, `application/json; charset=utf-8`, 4,978 B |
| `https://www.jobberstatus.net/api/v2/w6w-bogus-probe.json` | **404, zero bytes** |
| `https://jobber.statuspage.io/api/v2/summary.json` | 200, identical bytes (md5 `9fcccf35…`) |
| `https://jobber.statuspage.io/api/v2/w6w-bogus-probe.json` | **404, zero bytes** |

Not a catch-all: the bogus sibling 404s on both hosts, and the real path returns a payload the bogus
one does not.

**(b) Content-type and body.** `application/json; charset=utf-8`, and the body carries a real
Statuspage identity plus Jobber-specific components no generic page could fabricate:

```json
{"page":{"id":"7qns4hqkcjx5","name":"Jobber","url":"https://www.jobberstatus.net",
         "time_zone":"America/Denver","updated_at":"2026-08-03T14:24:07.343-06:00"},
 "status":{"indicator":"none","description":"All Systems Operational"}}
```

`America/Denver` is consistent with Jobber being an Edmonton company on Mountain time, and the
component list includes "Jobber Payments" and "QuickBooks Online Integration".

`jobber.statuspage.io` serves byte-identical content, but `www.jobberstatus.net` is what the page's
own `page.url` field declares, so that is the host this app probes.

**The near miss, recorded because it is exactly the trap.** The *plausible* guess for a vendor whose
domain is `getjobber.com` is `getjobber.statuspage.io`. That host answers **200** with **127,720
bytes of `text/html`** (md5 `8d3c480a2267df799ad5818e403a0551`), having redirected to
`https://www.atlassian.com/software/statuspage` — Atlassian's own marketing site, containing nothing
about Jobber whatsoever. It would sail through a naive "did it 200?" test. Two further guesses,
`status.getjobber.com` and `status.jobber.com`, do not resolve at all.

### `quota` — GraphQL query-cost headroom

Jobber does not meter in `X-RateLimit-*` headers. Its real budget is query cost, and it publishes the
reading in the response body under `extensions.cost`:

```jsonc
"extensions": { "cost": {
  "requestedQueryCost": 142,
  "actualQueryCost": 47,
  "throttleStatus": { "maximumAvailable": 10000, "currentlyAvailable": 9953, "restoreRate": 500 }
} }
```

That object *is* the honest quota signal, so this probe reads it rather than inventing a header
Jobber does not send. The probe itself is `{ account { id } }` — one field, one point.

A leaky bucket has no reset instant, so `resetAt` is reported as the moment the bucket is projected
to be **full again** at the advertised restore rate, which is the closest true statement to "when
will this be topped up". A throttled probe still carries a cost block, and the check reports that
reading rather than discarding it.

**`severity: "informational"`,** for two reasons. Headroom is context, not a verdict, and it should
never worsen a roll-up. And an account that has just run one large legitimate query is *supposed* to
be near zero — at 500 points/second, a low reading is frequently a normal reading a second old.

**Provenance, stated plainly.** The shape of `extensions.cost` is transcribed from Jobber's API Rate
Limits page, which prints it twice with worked values. It **could not be confirmed on the wire**
while building this app: an unauthenticated request to the live endpoint returns no `extensions`
block at all (checked 2026-08-03), and no Jobber credential was available. The probe is written so a
missing or malformed cost block reports `unknown` with a message naming exactly what was absent,
rather than fabricating a bucket.

**What is deliberately not reported.** The Rack::Attack limiter (2,500 requests per 5 minutes,
answering 429) exposes nothing about how much of its bucket is spent — no header, no `extensions`
key. Deriving a second bucket from the documented ceiling would be a guess dressed as a measurement.
Jobber's own note is that this limiter "is typically less restrictive than the GraphQL Query Cost",
so the bucket that *is* readable is also the one that usually binds.

### `auth:oauth2` — derived

The Auth method's `test` hook is promoted into the health surface by the host. `account-get` is
additionally tagged `healthCheck: { kind: "credential" }`: a parameterless `read` action that names
the connected account *is* the right liveness probe, and severity defaults to `fatal` for that kind,
which is correct — a Connection that cannot name its own account cannot do anything else either.

**No check here is `unavailable`.** Both declared checks are live probes against something the
vendor genuinely publishes. `tests/index.test.ts` asserts that any `unavailable` entry added later
must carry `severity: "informational"`, since an unavailable entry reports `unknown` and `unknown` at
the default `degraded` severity would pin the App at `unknown` forever.

## Where the docs and the schema disagree

Jobber's "Important Objects" section is a hand-maintained summary, and it says so: *"Our list of
field names is always changing. For the most up-to-date schema, please follow our Getting Started
steps and view everything in GraphiQL."* It has drifted. Every item below was confirmed by comparing
that page against the live introspection result on 2026-08-03:

| Docs say | Live schema |
|---|---|
| `ProductOrService.onlineBookingEnabled` | `onlineBookingsEnabled` (plural) |
| `Job.timesheetEntries` | `timeSheetEntries` (capital S) |
| `Client.workObjects` | Absent. The nearest field is `requestedWorkObjects` |
| `TimeSheetEntry.visit`, `.visitDurationTotal` | Absent entirely |
| `Job.jobNumber: Integer!` | `Int!` — there is no `Integer` scalar |
| `Quote.previewUrl: String!` | `String` (nullable) |
| `Job.property: Property` | `Property!` (non-null) |

None of these are catastrophic on their own; collectively they are the argument for building from
introspection. Which is what this app did.

There is also a smaller live-endpoint observation worth recording: the docs state the version header
is "required for all apps", but an **unauthenticated** request with the header omitted entirely still
returned 200 with the ordinary `UNAUTHENTICATED` error rather than a missing-header error. Whether
the requirement is enforced only on authenticated requests could not be determined without a
credential. This app always sends it, so the question is academic here.

## Deliberately not built

| | Why |
|---|---|
| Webhook triggers (`APP_DISCONNECT`, record events) | Triggers, not Actions. A published Jobber marketplace app is *required* to handle `APP_DISCONNECT`, so this is a real gap for marketplace use — it belongs in a Trigger, not here |
| Anything that emails a client | A workflow that silently mails customers is a much larger commitment than one that updates records |
| `clientDelete` | Archiving is reversible, keeps history, and is what the product's own UI offers. Deletion is a different risk class — available through `graphql-query`, where it has to be written out on purpose |
| `visitUncomplete` | Unwinds billing state; should be a decision, not a retry |
| `invoiceCreate` (the general form) | Requires re-deriving line items, tax and due terms that `invoiceCreateFromJob` carries across for free |
| Recurring job schedules | `ICalendarRule` strings prefixed `RRULE:`; a malformed one silently misschedules months of work |
| Custom fields, job forms, assessments | Each is a nested structure meaningful only against a specific account's templates. A half-filled one is worse than none |
| Batch create (`clientsCreate`, multi-visit `visitCreate`) | The mutations take lists; the single-item form is what a workflow step wants. Batches go through `graphql-query` |
| Jobber Payments, payouts, capital loans, job costing, expenses, timesheets | Real subsystems, out of scope for the field-service spine. All reachable through `graphql-query` |

## Icon

`assets/icon.svg` is **Jobber's own mark**, not a drawing.

n8n's `nodes-base` has no Jobber node (307 nodes checked, 2026-08-03), so there was no upstream mark
to copy. Instead the glyph was extracted from Jobber's own site: `https://www.getjobber.com/` renders
its header logo as an inline `<svg viewBox="0 0 367.3 65.7" aria-label="Jobber">` containing a single
`<path>` whose final subpath — starting `M56.1.6c-.4-.4-.8-.6-1.3-.6H24.1C10.8 0 0 10.8 0 24.1…` — is
the square "J-in-a-rounded-square" mark, occupying `0 0 65.7 65.7`. That subpath is reproduced
**verbatim**, re-wrapped in a square viewBox.

The fill, `#7DB00E`, is Jobber's own declared brand green: it is the `background_color` in
`https://developer.getjobber.com/manifest.webmanifest`. (The site's own SVG uses `currentColor` and
inherits the colour from CSS, so a literal value had to come from somewhere; the vendor's manifest
is the most authoritative source available.)

## Development

```sh
cd apps/jobber
deno task test    # 159 unit tests
deno task check
deno task lint
deno task fmt     # never bare `deno fmt` — it would rewrite assets/icon.svg
```

Tests use a mocked `HookContext` (`tests/_helpers.ts`) — no network, no server. Beyond per-action
coverage, `tests/index.test.ts` enforces the sandbox and transport rules **in source**: no action may
reference a credential, set `Authorization`, build the version header, hard-code a URL, call global
`fetch` or touch `Deno.*`; every mutation must select `userErrors` *and* route through `unwrap`; and
no static document may select an unbounded connection.

`tests/lib/client.test.ts` and every mutation's test file cover the HTTP-200-with-failure path
explicitly, using the exact response bodies the live endpoint and the documentation produce.

## Links

Every URL below was verified on 2026-08-03 by fetching it and inspecting the response body, not by
checking for a 200.

- **Website** — https://www.getjobber.com/
  *(the candidate entry for this app pointed at `https://www.getjobber.com/plp/zapier`, which is a
  Zapier landing page, not the product homepage)*
- **API docs (Developer Center)** — https://developer.getjobber.com/docs/
- **Getting started / GraphiQL** — https://developer.getjobber.com/docs/getting_started/
- **App authorization (OAuth 2.0)** — https://developer.getjobber.com/docs/building_your_app/app_authorization/
- **Refresh token rotation** — https://developer.getjobber.com/docs/building_your_app/refresh_token_rotation/
- **API versioning** — https://developer.getjobber.com/docs/using_jobbers_api/api_versioning/
- **API rate limits** — https://developer.getjobber.com/docs/using_jobbers_api/api_rate_limits/
- **Webhooks** — https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/
- **Changelog (the list of active API versions)** — https://developer.getjobber.com/docs/changelog/
- **App Marketplace** — https://apps.getjobber.com/app_marketplace
- **Status page** — https://www.jobberstatus.net/ · API: `/api/v2/summary.json`
- **Source / git repo** — https://github.com/GetJobber — Jobber's public org (64 repos; `name`
  "Jobber", homepage `getjobber.com`). Note it is `GetJobber`, not `jobber` or `jobber-io`, both of
  which 404. There is **no API client SDK** in it — nothing on npm, RubyGems or PyPI wraps this
  GraphQL API, and the Developer Center links none. What the org does contain, and what the
  Developer Center's "App Template Project" section refers to, is a **pair of reference
  integrations**:
  - https://github.com/GetJobber/Jobber-AppTemplate-RailsAPI — "Backend API example for integrating
    your app with Jobber", Ruby on Rails. The closest thing to an official worked example of the
    OAuth flow and the GraphQL calls.
  - https://github.com/GetJobber/Jobber-AppTemplate-React — the matching frontend, built on Atlantis.

  **Atlantis** (`@jobber/components` on npm) is Jobber's design system for building UI *inside*
  Jobber. It is unrelated to calling this API — listed so nobody mistakes one for the other.

  Because there is no upstream client to check against, this app was built from live introspection
  instead.

> The API docs site is served behind Cloudflare and rejects requests without a browser-shaped
> `User-Agent` and `Accept` header with a 403. That is a fetching quirk, not an access restriction —
> the content is public.
