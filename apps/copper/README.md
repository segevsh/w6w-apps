# Copper

Copper CRM people, companies, opportunities, leads, tasks, activities and account metadata, on the
**Copper Developer API v1**.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 24
- **Egress allowlist** — `api.copper.com`
- **Website** — https://www.copper.com/
- **API docs** — https://developer.copper.com/

Copper is the CRM that lives inside Google Workspace — it reads Gmail and Calendar and surfaces the
pipeline beside them, rather than asking a salesperson to leave their inbox. That heritage shows up
in the API: contacts are keyed on email address, "Google Sync" is a first-class component on the
status page, and the whole product assumes a Workspace identity underneath.

## The two things most likely to go wrong

Both are stated up front because both look like ordinary REST until they are not.

### 1. Authentication is THREE headers, and none of them is `Authorization`

Copper does not use a bearer token. Its Requests page opens with "All Copper API calls must include
the following headers to authenticate the request" and prints a four-row table — repeated verbatim
in every single `curl` example across the documentation (148 occurrences of each header name, as of
2026-08-03):

| Key                | Value                        |
| ------------------ | ---------------------------- |
| `X-PW-AccessToken` | API Key                      |
| `X-PW-Application` | `developer_api`              |
| `X-PW-UserEmail`   | Email address of token owner |
| `Content-Type`     | `application/json`           |

Three of those four are the credential and are stamped by the auth `sign` hook. `Content-Type`
belongs to the request body and is set by `lib/client.ts` on the calls that carry one.

**`X-PW-Application` really is the literal string `developer_api`.** It is not an app name, not a
client id, and not something the user supplies — Copper documents exactly one legal value, and every
published example sends it unchanged, including the OAuth ones. It is a constant in
`auth/api-key.ts`, not a connection field, because prompting for it could only produce a wrong
answer. (It happens to match the `developer_api` path segment in the base URL. That is a mnemonic,
not a rule.)

**The token owner's email is part of the credential.** `X-PW-UserEmail` must carry the address of
the user who generated the key. A Copper key is minted by a specific user, inherits that user's Team
Permissions, and is meaningless paired with anyone else's address — so the address is the second half
of the credential, exactly like a username in Basic auth. It lives on the **Connection** and is
stamped in `sign`.

It is deliberately **not** an action parameter. Making it one would put credential material in the
network-capable action worker, let two actions on one Connection disagree about who they are, and
hand a workflow author a knob whose only correct setting is a value they cannot see.
`tests/index.test.ts` asserts no action declares such a param, and `tests/auth/api-key.test.ts`
asserts all three headers land on every signed request regardless of method or path.

It is stored as a plain `string`, not a `secret`: an email address is an identifier, not a secret,
and masking it would make a typo impossible to spot. The token beside it is masked.

### 2. Listing is `POST /{resource}/search`, not `GET /{resource}`

**There is no `GET /people`.** Copper reads every collection through a `/search` sub-resource that
takes a POST with a JSON body:

```
POST /people/search          POST /companies/search
POST /opportunities/search   POST /leads/search
POST /tasks/search           POST /activities/search
POST /users/search           POST /projects/search
```

Filters, sorting and pagination all live in that body — there are no query strings on these calls.
`tests/lib/client.test.ts` pins this explicitly, including that nothing leaks into the query string.

What makes it easy to blur is that Copper *also* has plain GETs, for two other shapes:

- **Fetch one record** — `GET /people/{id}`, `GET /companies/{id}`, `GET /users/me`.
- **Account metadata** — `GET /pipelines`, `/pipeline_stages`, `/activity_types`,
  `/custom_field_definitions`, `/lead_statuses`, `/customer_sources`, `/contact_types`,
  `/loss_reasons`, `/tags`, `/account`.

So both verbs are correct, on different things. The rule is: *anything holding customer records is a
POST search; everything else is a GET.*

#### Pagination lives in the body too

`page_number` (1-based, default 1) and `page_size` (default 20, **max 200**) are body fields, as are
`sort_by` and `sort_direction`. A single search can page through at most **100,000 records** however
it is sized; Copper's advice past that is to narrow the filter, not to page deeper.

Copper also recommends always sorting: "This ensures that records are returned in a consistent
fashion across requests." Without it, page 2 may overlap page 1. Every search action here exposes
`sortBy` / `sortDirection` for that reason. Note the *default* sort field varies per resource
(`first_name` for People, `name` for Opportunities and Leads, `date_modified` for Companies,
`due_date` for Tasks), which is a second reason to set it explicitly.

#### The total arrives on a header, not in the body

A `/search` response body is a **bare JSON array** — no envelope, no `data` key, no cursor. The count
comes back as the `X-PW-TOTAL` response header, which Copper describes as "an upper bound of the
total number of records returned in the search query".

`lib/client.ts` folds the two together, so every search action returns:

```jsonc
{ "records": [ /* the bare array */ ], "total": 775 }
```

`total` is `undefined` — never `0` — when the header is absent. "Copper did not say how many there
are" and "there are none" are different facts, and collapsing them would make a paging loop stop
early.

## Other conventions this app encodes

**PUT is a PATCH.** "Updates are only applied to fields explicitly specified in the request body...
To remove the value from a field, the request body must specify the target field value as 'null'."
So `undefined` and `null` mean different things, and the distinction is preserved: `compact()` strips
`undefined` (leave the field alone) and forwards `null` (clear it).

**Dates are Unix seconds, with documented exceptions.** Copper's best-practices page: values are "10
digit long integers... There are a few notable exceptions, however. The `close_date` on
Opportunities, Task Due Dates and Reminder dates, and custom date fields use an ISO mm/dd/yyyy
format." `createOpportunity` / `updateOpportunity` therefore type `closeDate` as a **string** and say
so in the field hint, because passing a timestamp there is a silent, plausible mistake.

Task due/reminder dates are the one place Copper's two documents disagree with each other: the Task
properties table types them `number` and the create example sends `"due_date": 1496799000`, while the
best-practices page groups them with the `MM/DD/YYYY` exceptions. This app follows the endpoint's own
worked example (numbers) and records the conflict in the field hints rather than picking silently.

**Custom fields are an array, not a map.** Copper stores them as
`[{ "custom_field_definition_id": 100764, "value": "..." }]` with no field name attached — so a value
is unreadable, and unwritable, without `listCustomFieldDefinitions`. That action returns each
definition's `data_type` (which decides whether `value` is a string, number, boolean, timestamp or
option id), its dropdown `options`, and the `available_on` record types.

**`-2` is the "no value" sentinel.** Id-shaped search filters accept it to mean "records with none":
`assigneeIds: [-2]` finds unowned records. Copper documents this per resource; it is noted in the
hints where it applies.

**Uniqueness constraints fail rather than duplicate.** Email address is a unique key for People, and
email domain for Companies — "If you try to create a new Person with an existing email address, then
your request will fail." Both create actions are marked `idempotent: false` anyway: an error is not a
no-op.

**Ids are unique only within a resource type.** "A given identifier for a Lead will never be assigned
to a different Lead, but a different resource such as a Person could use the same identifier." A
Person id is not a Company id.

## Actions

### People

| Action                 | Endpoint                      | Notes                                             |
| ---------------------- | ----------------------------- | ------------------------------------------------- |
| `search-people`        | `POST /people/search`         | Name, emails, phone, company, assignee, tags, geo, created-date bounds |
| `get-person`           | `GET /people/{id}`            | Single record, with custom field values           |
| `find-person-by-email` | `POST /people/fetch_by_email` | Exact lookup — email is a unique key. The address goes in the body |
| `create-person`        | `POST /people`                | Only `name` required                              |
| `update-person`        | `PUT /people/{id}`            | PATCH-like. No `companyId` — see below            |
| `delete-person`        | `DELETE /people/{id}`         | Not recoverable via the API                       |

`update-person` deliberately does **not** offer `companyId`. Copper returns it on the Person but
documents that re-pointing a Person at a different Company must go through the Related Items API:
"if you would like to unrelate and relate a new `company_id`, use the related items API call." A
param that silently does nothing would be worse than its absence.

### Companies

| Action             | Endpoint                 | Notes                                  |
| ------------------ | ------------------------ | -------------------------------------- |
| `search-companies` | `POST /companies/search` | Name, email domains, contact type, geo |
| `create-company`   | `POST /companies`        | `email_domain` is a unique key         |
| `update-company`   | `PUT /companies/{id}`    | PATCH-like                             |

### Opportunities

| Action                  | Endpoint                     | Notes                                        |
| ----------------------- | ---------------------------- | -------------------------------------------- |
| `search-opportunities`  | `POST /opportunities/search` | Status, pipeline, stage, value and date bounds |
| `create-opportunity`    | `POST /opportunities`        | `closeDate` is `MM/DD/YYYY` text              |
| `update-opportunity`    | `PUT /opportunities/{id}`    | Advance a stage, or close Won/Lost            |

Note Copper's asymmetry: the **search filter** takes numeric `status_ids` (hard-coded `0`/`1`/`2`/`3`
for Open/Won/Lost/Abandoned), while the **record itself** carries `status` as the equivalent string,
which is what create and update take. Both are offered as fixed `select` options so neither has to be
guessed.

`create-opportunity` marks only `name` required. Copper's create page says "The following fields are
required for this request: name", while its Opportunity properties table separately asterisks
`primary_contact_id` — the two documents disagree. This app follows the endpoint page and flags the
contact as strongly recommended in its hint rather than guessing which document is stale.

### Leads

| Action         | Endpoint             | Notes                                                 |
| -------------- | -------------------- | ----------------------------------------------------- |
| `search-leads` | `POST /leads/search` | `includeConvertedLeads` defaults false; `emails` is a **string** |
| `create-lead`  | `POST /leads`        | `email` is a single **object**, not an array          |

A Lead is Copper's pre-qualification catch-all — it "contains information about the contact, the
company and the project in one" and is split into a Person, Company and Opportunity on conversion.
Its email shape differs from People's in both directions, which is the easiest thing here to get
backwards: People take `emails: [{email, category}]`, a Lead takes `email: {email, category}`. Phone
numbers, socials and websites stay arrays on both.

Lead statuses come in two vocabularies too: the record carries the strings New / Unqualified /
Contacted / Qualified, while the search filter takes **account-specific** numeric ids from
`GET /lead_statuses` — unlike Opportunity statuses, they are not a fixed 0–3.

### Tasks

| Action         | Endpoint             | Notes                                                        |
| -------------- | -------------------- | ------------------------------------------------------------ |
| `search-tasks` | `POST /tasks/search` | `statuses` are plain strings here, no numeric-id detour       |
| `create-task`  | `POST /tasks`        | `related_resource` assembled from a type + id pair            |

`completed_date` is deliberately not offered: Copper sets it automatically when the status flips from
Open to Completed and says it "cannot be set directly".

### Activities

| Action              | Endpoint                  | Notes                                            |
| ------------------- | ------------------------- | ------------------------------------------------ |
| `search-activities` | `POST /activities/search` | Scoped by `parent` and by `{id, category}` type pairs |
| `create-activity`   | `POST /activities`        | Category is always `user`                        |

Only user-category activities can be written: "Only 'User' type Activities can be created or modified
using the developer API. 'System' type Activities are read-only." So `create-activity` offers no
category selector — it would offer a value that cannot work. Its `activityTypeId` defaults to `0`,
Copper's hard-coded id for Notes, so logging a note needs no lookup; Phone Calls, Meetings and custom
types get per-account ids from `list-activity-types`.

`search-activities` exposes Copper's `full_result` escape hatch for a timing-out search, with both
its caveats in the hint: it is ignored unless the key belongs to an administrator, and it may return
duplicate rows for one activity.

### Account metadata

| Action                          | Endpoint                                             |
| ------------------------------- | ---------------------------------------------------- |
| `list-pipelines`                | `GET /pipelines` (stages nested in)                   |
| `list-pipeline-stages`          | `GET /pipeline_stages`, or `.../pipeline/{id}`        |
| `list-activity-types`           | `GET /activity_types` — keyed `{user, system}`        |
| `list-custom-field-definitions` | `GET /custom_field_definitions`                       |
| `list-users`                    | `POST /users/search` — paging only, no filters        |
| `list-related-items`            | `GET /{entity}/{id}/related[/{related_entity}]`       |

`list-activity-types` passes Copper's category-keyed response through unchanged rather than
flattening it, because an activity type id is only meaningful paired with its category — `user` and
`system` types are numbered separately.

`list-users` offers **only** `pageNumber` and `pageSize`. Copper's parameter table for that endpoint
documents no filters and no sorting, and adding them would be inventing surface.

`list-related-items` returns `{id, type}` identifiers, not full records — "The Related Items API uses
Identifiers (as opposed to full objects)." Relationships are bidirectional and constrained to
documented pairs (a Lead, for instance, relates only to Tasks).

### Not implemented

Real endpoints deliberately left out of this first version, so their absence is a decision rather
than an oversight: Projects (search/CRUD), bulk create/update for People, Companies, Leads,
Opportunities and Activities, lead conversion (`POST /leads/{id}/convert`), the `related` add/remove
writes, webhook subscriptions, file upload (a three-step signed-S3 dance), field layouts, and the
metadata GETs that are a single unfiltered list each (`/contact_types`, `/customer_sources`,
`/lead_statuses`, `/loss_reasons`, `/tags`). Copper also documents an OAuth 2.0 flow, which it calls
"the preferred approach for partner integrations"; the API key ships here because it needs no app
registration, no redirect URI and no client secret, and works in unattended background runs.

## Health checks

### `service` — Copper platform status

Atlassian Statuspage at **`status.copper.com`**, read once per app (not per Connection),
unauthenticated and unsigned. The probe is `GET /api/v2/summary.json`, which returns the rollup
indicator *and* the per-component breakdown in one request.

The component breakdown matters for a product this broad: Copper reports **Developer API**, "Rest API
& Web Application", "Google Sync", "CRM for Gmail Chrome Extension", "Workflow Automation",
"Reporting", "Forms Builder" and eight more separately. A workflow that only calls the REST API is
unaffected by a Chrome extension outage, and a component-level answer can say so instead of greying
out the whole App.

`status.copper.com` is **not** on the app's main egress allowlist — an action has no business calling
it. The allowlist is widened for this one hook, which the spec permits precisely because the posture
is unsigned. That constraint is load-bearing here: Copper's credential is three headers, and a
third-party status host must never see any of them.

A status page that itself fails reports `unknown`, never `down` — it says nothing about Copper, and
calling that an outage would be a lie.

#### Verifying the endpoint is real, two ways

A JSON-shaped path returning 200 is not proof of an API. Both checks were run on 2026-08-03:

**(a) Deliberately bogus siblings on the same host.**

| Path                     | Result                          |
| ------------------------ | ------------------------------- |
| `/api/v2/status.json`     | 200, `application/json`, 229 B  |
| `/api/v2/summary.json`    | 200, `application/json`, 5216 B |
| `/api/v2/components.json` | 200, `application/json`, 5103 B |
| `/api/v2/notareal.json`   | **404, zero bytes**             |
| `/api/v2/statusz.json`    | **404, zero bytes**             |

**(b) Content-type and body inspection.** All three real paths answer `application/json; charset=utf-8`
with distinct sizes and genuinely different payloads, and `status.json` carries a real Statuspage
identity:

```json
{"page":{"id":"htdm1sj52pny","name":"Copper","url":"https://status.copper.com",
         "time_zone":"America/Los_Angeles","updated_at":"2026-08-03T11:25:05.882-07:00"},
 "status":{"indicator":"none","description":"All Systems Operational"}}
```

`summary.json` lists fifteen named components, including one called exactly "Developer API" — an
account-specific set no HTML catch-all could fabricate.

**The near miss, recorded because it is exactly the trap.** `https://copper.statuspage.io/` — the
plausible-looking vendor-subdomain form — is **not** Copper's status page. It answers 200 with
**127 KB of `text/html`**, having redirected to `https://www.atlassian.com/software/statuspage`:
Atlassian's own marketing site. It would sail through a naive "did it 200?" test while containing
nothing about Copper whatsoever. Only `status.copper.com` is used.

### `quota` — declared `unavailable`

Copper publishes a real rate limit but **no way to read your remaining headroom**, so this check
declares `unavailable` with a reason rather than pretending to probe.

The limit itself is documented plainly: "All API calls are limited to 180 requests per minute. Once
this limit has been reached, calls will return an error response with status code 429. This rate
limit is evaluated on a rolling window basis." Bulk endpoints carry a second limit of 3 requests per
second.

The question a `quota` check has to answer is whether any of that is *readable* before you exhaust
it. It is not, and this was verified two ways rather than assumed:

1. **Nothing in the documentation names a header.** A search of every page on `developer.copper.com`
   for `X-RateLimit-*`, `RateLimit-*` and `Retry-After` returns **zero** occurrences. The only
   response header Copper documents at all is `X-PW-TOTAL`, on `/search` responses — and that is a
   result count, not an allowance.
2. **A live request confirms it.** `GET https://api.copper.com/developer_api/v1/users/me` on
   2026-08-03 returned its full header set — `date`, `content-type`, `cache-control`, `pragma`,
   `expires`, `vary`, `x-request-id`, `x-runtime`, `strict-transport-security`, `x-frame-options`,
   `x-download-options`, `content-security-policy` — with **no rate-limit header among them**.

A probe would therefore either report `unknown` on every run, or count its own calls — which measures
this app's traffic rather than the credential's actual allowance, since the 180/minute is shared
across everything using that key. Both are worse than saying so. `severity: "informational"` keeps
that honest `unknown` from pinning the App's verdict forever.

### `auth:api-key` — derived, free

The runtime derives a credential check from the Auth `test` hook, which probes `GET /users/me`. That
is the right liveness probe precisely because it needs no permission beyond existing — Copper
documents it as returning "details about the current API user... who owns the API key". Probing a
record collection instead would report a working credential as broken whenever Team Permissions
restrict that user's access, and Copper is explicit that "The Dev API respects team permissions".

## Icon

`assets/icon.svg` is Copper's own mark, copied **byte-for-byte** from n8n's `nodes-base` Copper node
(`nodes/Copper/copper.svg`, 2091 bytes), verified with `diff`.

## Development

```sh
cd apps/copper
deno task test    # 152 unit tests
deno task check
deno task lint
deno task fmt
```

Tests use a mocked `HookContext` (`tests/_helpers.ts`) — no network, no server. Beyond per-action
coverage, `tests/index.test.ts` enforces the sandbox rules in source: no action may reference a
credential, build any of the three `X-PW-*` headers itself, call global `fetch`, or touch `Deno.*`,
and none may declare the token owner's email as a parameter.

## Links

Every URL below was verified on 2026-08-03 by fetching it and inspecting the response body, not by
checking for a 200.

- **Vendor site** — https://www.copper.com/
- **Developer API docs** — https://developer.copper.com/ (MkDocs Material; the whole reference,
  one page per endpoint)
- **Authentication** — https://developer.copper.com/introduction/authentication.html
- **Request headers and rate limits** — https://developer.copper.com/introduction/requests.html
- **Paginating search results** — https://developer.copper.com/introduction/pagination.html
- **Best practices (date formats, team permissions)** —
  https://developer.copper.com/introduction/best_practices.html
- **Postman collection** — https://developer.copper.com/download/copper_postman_collection.json
  (1.3 MB of real, runnable requests — the fastest cross-check for a body shape)
- **Status page** — https://status.copper.com/ · API: `/api/v2/summary.json`
- **GitHub org** — https://github.com/ProsperWorks — Copper's org still carries its founding name,
  the same fossil as the `developer_api` path segment. Its `name` field reads "Copper CRM, Inc." and
  its homepage is copper.com. `github.com/coppercrm` exists but is an empty placeholder (0 repos).
- **Embedded App SDK** — https://github.com/ProsperWorks/copper-sdk (TypeScript; docs at
  https://docs.copper.com/copper-sdk/). This is for building UI panels *inside* Copper, not for
  calling the REST API — unrelated to this app, listed so nobody mistakes one for the other.
