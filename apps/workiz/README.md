# Workiz

Manage the team, leads and jobs of a home-service business — and the payments
recorded against a job — through Workiz's public API.

- **Categories** — calendar, crm, finance
- **Auth methods** — api-token
- **Actions** — 20
- **Egress allowlist** — `api.workiz.com` and `workiz.statuspage.io`; the
  `service` health check also declares the status host for itself and is
  unsigned
- **Website** — https://www.workiz.com
- **API docs** — http://developer.workiz.com/ — its machine-readable OpenAPI
  3.0.0 document at `http://developer.workiz.com/api.json` (62,971 bytes,
  `info.title: "Workiz"`) was the source for every path, verb, parameter, body
  field and enum here. Read 2026-09-22.

## Setup

Workiz issues **one API token per account** (not per user). Connect by pasting
that token into the connection's single field; the app never asks for a host, a
subdomain or a second credential.

Unlike the usual API-token integration, there is nothing to configure about
*where* the token goes: Workiz accepts it in exactly one place, the request path
(see below).

## The account token is a URL path segment, not a header

Workiz's every endpoint reads

```
https://api.workiz.com/api/v1/{api_token}/<endpoint-path>
```

The token is a **path segment** in the middle of the URL. The vendor's OpenAPI
document declares **no** `Authorization` header, no bearer scheme and no
`?token=` parameter, so none is used — a header-based integration cannot work
against this API at all.

That shapes the app's code:

- Actions build the **token-free** URL (`https://api.workiz.com/team/all/`) and
  know nothing about credentials.
- The auth `sign` hook is the only code that inserts `/api/v1/<token>` before
  the path. It is network-less and returns the rewritten request.
- The auth method is declared `type: "custom"` rather than `type: "apiKey"`,
  because the spec's `apiKey` config can only put a secret in a header, a query
  parameter or a body — and Workiz's token is in none of those. `bitrix24`'s
  inbound webhook, whose secret is likewise a path segment, takes the same
  route.
- Error messages are token-free by construction, because the URL they describe
  is the one the action built, before signing.

Because the host logs request URLs, this means the token appears in request
logs. That is unavoidable — it is the API's only transport — and it is why the
token deserves to be a dedicated one that can be rotated on its own.

## Two secrets, and only one of them belongs to the connection

| Secret | Scope | Where it lives |
|---|---|---|
| API token | the account | the connection (`sign`) |
| `auth_secret` | **one record** | an ordinary action input |

A lead or job create/get response hands back a per-record `auth_secret` (the
vendor's own examples use `"sec_xyz"` /
`"sec_8261349333556056446305097980"`). Every write against an existing record —
lead/job update, assign, unassign, convert, markLost, activate, addPayment —
must supply it back.

It is modelled as a normal string action input (`authSecret`, sent as
`auth_secret`), never injected by `sign`: it is per-record, not per-connection,
and the account API token is the only thing that belongs to the connection.

The practical consequence for a workflow: **call a get (or keep the create
response) before any lifecycle call**, because the record secret is not
recoverable any other way.

## Actions

| Key | Type | Description |
|---|---|---|
| `team-list` | read | List every team member |
| `team-get` | read | Read one team member by id |
| `time-off-list` | read | Company time off, optionally every user's |
| `time-off-list-for-user` | read | One user's time off, addressed by **name** |
| `lead-get` | read | Read one lead by UUID |
| `lead-list` | search | List leads by date window, open-only and status |
| `lead-create` | perform | Create a lead |
| `lead-update` | perform | Update a lead's fields, status and tags |
| `lead-mark-lost` | perform | Mark a lead lost |
| `lead-activate` | perform | Put a lost lead back |
| `lead-assign` | perform | Assign a user to a lead |
| `lead-unassign` | perform | Clear a lead's assignment |
| `lead-convert` | perform | Convert a lead into a job |
| `job-get` | read | Read one job by UUID |
| `job-list` | search | List jobs by date window, open-only and status |
| `job-create` | perform | Create a job |
| `job-update` | perform | Update a job's fields, status, sub-status and tags |
| `job-assign` | perform | Assign a user to a job |
| `job-unassign` | perform | Clear a job's assignment |
| `job-add-payment` | perform | Record a cash, credit or cheque payment against a job |

### Idempotency

An action marked `idempotent` may be retried by the runtime, so the flag is
stated in both directions:

- **`false`** — `lead-create`, `job-create`, `lead-convert`, `job-add-payment`.
  An update-less create has no idempotency key in this API, and a retry after a
  dropped connection would book a second record or a second payment. For
  `lead-convert` the repeat behaviour is not documented at all, so a retry could
  produce a second job.
- **`true`** — every update, assign, unassign, markLost and activate. Each
  carries the whole intended state, so repeating it lands on the same state.

### The lead → job chain

`lead-convert` returns the **new job's** identity in the same `{ClientId, UUID,
link}` shape the create calls use. The UUID it returns is the job's, not the
lead's, and it is what `job-get`, `job-update`, `job-assign` and
`job-add-payment` take afterwards.

### `job-add-payment` sends `type` twice

Workiz declares the payment `type` (`cash` | `credit` | `check`) as a required
**query parameter** *and* a required body field on
`POST /job/addPayment/{UUID}/?type=…`. Both are set from the action's single
`type` input. The rest of the body's required set is `{auth_secret, amount,
date}`, with `reference` optional; `date` is a date-time, not a date.

### Filters and paging

`lead-list` and `job-list` share one filter set:

- `start_date` (`yyyy-MM-dd`) — the vendor's own NOTICE: *"if `start_date` is
  not provided, default range is the last 14 days"*.
- `offset` (default 0) and `records` (default 100, **maximum 100**).
- `only_open` (default `true`), which excludes the Done and Canceled statuses.
  Turn it off to see closed records — the action sends an explicit `false`,
  which is a real filter value and not an omission.
- `status` — an optional list of literal status values (the vendor's own
  examples use `["Submited","In progress"]`, the misspelling is theirs).

`status` is declared as an OpenAPI array and the spec does not pin the
serialization style (`explode`), so this app sends it as a **repeated query
parameter** (`status=Submited&status=In+progress`), the OpenAPI default for
arrays. If a Workiz account turns out to expect a comma-joined value instead,
that is a one-line change in `lib/client.ts`.

## Response shapes are inconsistent, and the client does not pretend otherwise

Three shapes coexist across the 20 operations, and two calls that look alike
differ:

- **Bare arrays** — `/team/all/`, `/TimeOff/get/`, `/lead/all/`,
  `/lead/get/{UUID}/`, and all four lead lifecycle writes
  (`markLost`, `activate`, `assign`, `unassign`, `convert`).
- **`{flag, data: [{UUID, ClientId, link}]}`** — every lead/job create and
  update, and the **job** assign/unassign calls.
- **`{flag, data: <record>}` nested inside an array element** —
  `/job/get/{UUID}/`, where each element is the wrapper rather than the job.
  `/job/all/` is documented two ways in the vendor's own spec (flat `Job` rows
  vs the `response` wrapper) and this app accepts either reading rather than
  guessing.

The client carries those differences (`lib/client.ts`'s `unwrapRecord` and
`unwrapList`) instead of flattening them into one fiction. `/lead/get/`
answering an array of leads while `/job/get/` answers an array of wrappers is a
vendor decision, not a bug to paper over.

`flag: false` rides an ordinary 2xx on several writes, with the vendor's
explanation in `msg`. Those responses are returned to the workflow as-is — the
action does not turn `flag: false` into a thrown error, because the workflow,
not the transport, is what knows whether that outcome is acceptable.

## Errors are classified from the body, not the status

Workiz's only documented refusal is

```
HTTP 403
{"success": false, "error": "Forbidden", "message": "Invalid API path or malformed API key."}
```

verified live 2026-09-22 with both a fake token and an empty token segment. The
vendor makes **no distinction** between a missing token, a wrong token and a
malformed path — all three produce that one body — so the connection probe
reports them as a single invalid-credential case, classified on
`success === false && error === "Forbidden"` rather than on the 403. A body that
parses as the expected array is a working token regardless of the status line.

The probe is `GET /team/all/`: it takes no parameters and no per-record secret,
and its array body cannot be confused with the error shape.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Workiz up? |
| `request-rate` | quota | declared unavailable — see below |

### `service` — the real status page, on the right host

`https://workiz.statuspage.io/api/v2/summary.json` is a genuine Atlassian
Statuspage instance, verified 2026-09-22: `page.name: "Workiz"`,
`page.url: "https://workiz.statuspage.io"`, and a 15-component list that names
**`api.workiz.com`** directly alongside `app.workiz.com`, `Calls service`, `SMS
service`, `Communication` and `Integrations`. The page-level `status.indicator`
is the verdict; components are the detail, and `group: true` containers are
excluded so they are not double-counted.

`status.workiz.com` was rejected: it answers `200` for `/`, but its
`/api/v2/summary.json` path **404s** — it does not proxy the Statuspage JSON API
the way the `workiz.statuspage.io` host does, so a check pointed at it could
never read a status. The check is `credential: "none"` and unsigned, and
`workiz.statuspage.io` is declared both in the app's `network.allow` and in the
check's own `network.allow`.

### `request-rate` — a declared absence at `informational` severity

Verified live 2026-09-22: a real response from `api.workiz.com` carried only
`date`, `content-type`, `content-length`, `cache-control`, `expires`,
`referrer-policy`, `x-frame-options`, `server` (cloudflare), `cf-ray` and
`alt-svc` — **no** `X-RateLimit-*` headers of any kind — and the vendor's
OpenAPI document defines no `/limits`, `/quota` or `/account` endpoint at all
(its only resources are Jobs, Leads, Team and Time Off). There is nothing to
probe, so the check declares `unavailable` with that reason.

`severity: "informational"` is load-bearing: an `unavailable` entry always
reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
severity the declaration would pin the whole app at `unknown` forever.

There is deliberately no `quota` check beside it. Unlike Apify — which meters
plan consumption *and* request rate, and where only the latter is unreadable —
Workiz exposes neither, so adding a quota probe would be inventing an endpoint.

## Deliberately not covered

- **OAuth.** Workiz publishes no OAuth surface for third-party apps; the
  account API token is the whole authentication story.
- **Clients, invoices, estimates and everything else in the product.** The
  public API exposes exactly four resources — Team, Time Off, Leads and Jobs —
  and all four are covered. Workiz's product is larger than its API, and this
  app covers the API, not the product.
- **Webhooks/triggers.** The vendor's document declares no webhook or
  subscription endpoint, so there is no trigger surface to declare.
- **Latitude/Longitude on writes.** Both are returned on a lead, but Workiz's
  create/update bodies do not list them, so they are read-only here rather than
  guessed at.

## Icon

`assets/icon.svg` is Workiz's own mark, used verbatim: the logo linked from
`www.workiz.com`'s homepage markup at
`https://a.storyblok.com/f/292176025308856/7383/b4cb93beac/workiz-logo.svg`
(7,383 bytes, `viewBox="0 0 400 131"`, the `#FFD400` badge and `#23282B`
wordmark), fetched 2026-09-22. Nothing was redrawn, and the file is not passed
through any formatter.

## Layout

```
index.ts              the AppDefinition (20 actions, 1 auth method, 2 checks)
auth/api-token.ts     the path-segment credential, its probe and label
lib/client.ts         the REST client, response shapes and error classification
lib/params.ts         param groups shared by the lead/job bodies + authSecret
lib/schema.ts         the vendor's response records, in its own field names
actions/              one file per operation
health/service.ts     the workiz.statuspage.io roll-up
health/request-rate.ts the declared absence
tests/                one test file per action, plus auth, client, health, index
```

## Development

```sh
deno task validate   # conformance audit
deno task check      # type check
deno task lint
deno task test
deno task fmt
```
