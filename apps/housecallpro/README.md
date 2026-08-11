# Housecall Pro

Field-service management for home-service businesses — customers, jobs, estimates, leads, invoices,
scheduling and dispatch — over the **Housecall v1 public API** (`api.housecallpro.com`).

- **39 actions** across customers, jobs, estimates, leads, invoices, the price book and reference
  data.
- **2 auth methods**: an API key (`Authorization: Token …`) and OAuth 2.0 for approved integration
  partners (`Authorization: Bearer …`).
- **3 declared health checks** plus 2 derived `auth:*` checks.

---

## Where the reference came from

This is worth recording, because a documentation URL is not readable here.

`docs.housecallpro.com` is a **Stoplight**-hosted single-page app. Every path under it — real page,
nonsense path, or 404 — returns the same ~449 KB JavaScript shell with HTTP 200. Fetching a
documentation URL gets you the shell, not the content, and byte size barely separates the root
(449,419 B) from a 404 (449,596–449,801 B).

The route in was the page's own hydration state. The root HTML embeds a serialized store, and the
useful entries are:

```
"path":"router.workspaceSlug","args":["housecallpro"]
"path":"workspaces.currentWorkspace","args":[{"id":5512,"name":"Housecall Pro", … "homeContent": …}]
```

The `"projectId":"18203562583"` that also appears in that HTML is a **decoy** — it belongs to
`window.__OPTIMIZELY_DATAFILE__`, not to Stoplight, which is why every Stoplight API call keyed on it
answers 400 or 500. The workspace's `homeContent` markdown is what actually names the project:
it links to `docs.housecallpro.com/docs/housecall-public-api/…`, giving project slug
`housecall-public-api` (and a second project, `partner-jobs`).

With workspace + project slug, Stoplight's content API serves the raw sources:

```
https://stoplight.io/api/v1/projects/housecallpro/housecall-public-api/nodes/toc.json
https://stoplight.io/api/v1/projects/housecallpro/housecall-public-api/nodes/reference/housecall.v1.yaml
https://stoplight.io/api/v1/projects/housecallpro/housecall-public-api/nodes/docs/authentication.md
```

Everything in this app was built against those, fetched **2026-08-11**:

| Source | Size | What it is |
|---|---:|---|
| `reference/housecall.v1.yaml` | 222,172 B | OpenAPI 3.0, `info.title` "Housecall v1 API", one server `https://api.housecallpro.com`, 94 operations |
| `nodes/toc.json` | 51,348 B | The navigation tree — the exhaustive operation list |
| `docs/authentication.md` | 8,777 B | Header formats, the OAuth flow, the two OAuth hosts |
| `docs/changelog.md` | 8,664 B | Dated change log, most recent entry 2026-08-04 |
| `docs/franchise.md` | 4,233 B | `X-Company-Id`, the location hierarchy, OAuth access limits |
| `docs/webhooks.md` | 17,660 B | Event catalogue and HMAC signature verification |

**Is the API alive?** Yes, three ways. The changelog's most recent entry is dated **2026-08-04**,
one week before this app was written, and describes new response fields. Grepping the 222 KB
specification and all four prose pages for `deprecat|depreciat|sunset|will be removed|end of life|
retire` returns **zero matches** — there is no deprecation banner because there is no superseded
version: the reference publishes exactly one, "Housecall v1 API". And `GET
https://api.housecallpro.com/company` answers a live, schema-correct JSON 401.

---

## Authentication

### API key — `Authorization: Token <key>`

The prefix is **`Token`**, not `Bearer`. Both API-key schemes in the specification say
`Authorization Header value format [Token {api-key}]`, and the authentication page adds: "the
headers must follow these exact formats, including 'Token' or 'Bearer' at the beginning of your
header." `Bearer` is this same API's *OAuth* prefix — using it with a key produces a 401
indistinguishable from a revoked key.

There are two kinds of key behind that one header:

- a **Company API Key**, which a Pro on the MAX or XL plan generates in their own account settings;
- an **Application API Key**, issued to an approved integration partner.

They travel identically, so this app collects one field. The difference is what they can reach — see
[the 14-endpoint split](#fourteen-endpoints-refuse-a-pros-own-api-key) below.

### OAuth 2.0 — partners only

"OAuth 2.0 is available exclusively for official integration partners. All other developers should
use API key authentication." Credentials are issued by email after review.

The two hosts are **different**, which the authentication page states twice:

| Step | URL |
|---|---|
| Authorize (user consent) | `https://pro.housecallpro.com/oauth/authorize` |
| Token exchange + refresh | `https://api.housecallpro.com/oauth/token` |

Declared here as `pkce: false` — the documented flow authenticates with `client_secret` and never
mentions a code challenge, and the spec's default for `pkce` is `true`, so leaving it unset would
send one the vendor has not documented accepting. Scopes are `["public"]`, the single value the
vendor's worked example uses; no scope catalogue is published, and inventing one would be guessing
at an authorization surface. No `revokeUrl` and no `revoke` hook: revocation is documented only as
something the user does inside Housecall Pro.

Access tokens last about 30 days (`expires_in` 2,592,000 in the documented exchange response); an
expired one answers 401, which the 2023-11-21 changelog records as a deliberate fix.

### A 401 body cannot tell you what went wrong

Measured 2026-08-11 against `GET /company`:

| Credential sent | Status | Body |
|---|---|---|
| none | 401 | `{"message":"Unauthorized"}` |
| `Token deadbeef…` (well-formed, invalid) | 401 | `{"message":"Unauthorized"}` |
| `Bearer deadbeef…` | 401 | `{"message":"Unauthorized"}` |
| none, on `/customers` | 401 | `{"message":"Unauthorized"}` |

Byte-identical in all four cases. Neither `test` hook claims to distinguish "the credential never
reached the API" from "the API rejected it" — both say so, and name the `Token` / `Bearer` prefix
trap, because that is the third cause the same body covers.

---

## Fourteen endpoints refuse a Pro's own API key

The specification's per-operation `security` blocks split into four groups. Fourteen operations list
**only** the Application API Key and the OAuth token — a Company API Key is not accepted:

```
GET  /application                 POST /application/enable      POST /application/disable
GET  /checklists                  GET  /estimates/{estimate_id}  GET  /api/price_book/services
GET  /service_zones               GET  /routes
PUT  /jobs/{job_id}/schedule      DELETE /jobs/{job_id}/schedule PUT  /jobs/{job_id}/dispatch
POST /jobs/{job_id}/links         POST /jobs/{job_id}/lock       POST /jobs/lock
```

Two consequences, both acted on here:

1. The five actions in this app built on those endpoints — `estimate-get`, `job-schedule-update`,
   `job-dispatch`, `service-zone-list`, `route-list`, `price-book-service-list` — carry a note in
   their description saying an integration-partner credential is required.
2. The **auth probe is `GET /company`**, one of the 31 operations whose `security` lists all three
   credential kinds. Probing any partner-only endpoint would report a Pro's perfectly good key as
   broken.

Note the asymmetry it creates: `GET /estimates` accepts a Company API Key while
`GET /estimates/{id}` does not, so a Pro's key can list estimates but must read an individual one out
of that list.

---

## Actions (39)

Money is **integers in cents** everywhere — `total_amount`, `unit_price`, `unit_cost`, `amount`,
`due_amount`, `subtotal`.

### Customers (5)

| Key | Endpoint |
|---|---|
| `customer-list` | `GET /customers` — `q` searches name, email, mobile number and address |
| `customer-get` | `GET /customers/{customer_id}` |
| `customer-create` | `POST /customers` |
| `customer-update` | `PUT /customers/{customer_id}` |
| `customer-address-create` | `POST /customers/{customer_id}/addresses` — returns the `address_id` a job needs |

### Jobs (11)

| Key | Endpoint |
|---|---|
| `job-list` | `GET /jobs` |
| `job-get` | `GET /jobs/{id}` |
| `job-create` | `POST /jobs` — requires an existing `customer_id` **and** `address_id` |
| `job-line-item-list` | `GET /jobs/{job_id}/line_items` |
| `job-line-item-create` | `POST /jobs/{job_id}/line_items` |
| `job-schedule-update` | `PUT /jobs/{job_id}/schedule` |
| `job-dispatch` | `PUT /jobs/{job_id}/dispatch` |
| `job-note-create` | `POST /jobs/{job_id}/notes` |
| `job-tag-add` | `POST /jobs/{job_id}/tags` — takes a tag **id**, not a name |
| `job-appointment-list` | `GET /jobs/{job_id}/appointments` |
| `job-invoice-list` | `GET /jobs/{job_id}/invoices` |

### Estimates (5)

| Key | Endpoint |
|---|---|
| `estimate-list` | `GET /estimates` |
| `estimate-get` | `GET /estimates/{estimate_id}` |
| `estimate-option-line-item-list` | `GET /estimates/{estimate_id}/options/{option_id}/line_items` |
| `estimate-option-approve` | `POST /estimates/options/approve` |
| `estimate-option-decline` | `POST /estimates/options/decline` |

Approving has a documented side effect worth reading before wiring it up: "If company has
'Automatically copy an approved estimate to a new job' turned on, all approved estimate options will
be copied to a single job." The new job's id comes back as `copied_on_approval_to_job_id`, which is
declared as an output.

### Leads (4)

| Key | Endpoint |
|---|---|
| `lead-list` | `GET /leads` |
| `lead-get` | `GET /leads/{id}` |
| `lead-create` | `POST /leads` |
| `lead-convert` | `POST /leads/{id}/convert` — into a job or an estimate |

`lead-create` has two either/or pairs the reference states in its own field descriptions —
`customer_id` *or* an inline `customer` object, `address_id` *or* an inline `address` object. A
`Param` cannot express "exactly one of these two", so neither half is marked required and the pairing
is stated in each hint.

### Company and reference data (11)

| Key | Endpoint |
|---|---|
| `company-get` | `GET /company` — its `locations` array holds the multi-location ids |
| `employee-list` | `GET /employees` — **active** employees only |
| `booking-window-list` | `GET /company/schedule_availability/booking_windows` |
| `event-list` | `GET /events` — calendar events, not webhook events |
| `tag-list` | `GET /tags` |
| `tag-create` | `POST /tags` |
| `job-type-list` | `GET /job_fields/job_types` |
| `lead-source-list` | `GET /lead_sources` |
| `service-zone-list` | `GET /service_zones` — filter by zip or address to answer "do we serve here" |
| `route-list` | `GET /routes` |
| `pipeline-status-list` | `GET /pipeline/statuses` |

### Invoices and price book (3)

| Key | Endpoint |
|---|---|
| `invoice-list` | `GET /invoices` — three date ranges and an amount-due range, all combinable |
| `invoice-get` | `GET /api/invoices/{uuid}` |
| `price-book-service-list` | `GET /api/price_book/services` |

The `/api` prefix on two of those is real and is not a base-path mistake: `invoice-list` is
`/invoices` while `invoice-get` is `/api/invoices/{uuid}`. Four operations in the reference are
spelled that way and the other 90 are not.

---

## Things the reference gets subtle about

### Two spellings of "work status", and only one of them filters

| | Values |
|---|---|
| **Filter** (`GET /jobs`, `GET /estimates`) | `unscheduled`, `scheduled`, `in_progress`, `completed`, `canceled` |
| **Response** (a job's `work_status`) | `needs scheduling`, `scheduled`, `in progress`, `complete rated`, `complete unrated`, `user canceled`, `pro canceled` |

Five underscored values in, seven space-separated values out. Feeding a response value back into the
filter returns nothing and no error. Both lists are in `lib/params.ts`, and the filter param offers
only the filter vocabulary.

### Array query parameters are sent as `name[]=a&name[]=b`

The specification contradicts itself here and the choice was deliberate.

`GET /api/price_book/services` is the **only** place the vendor writes the wire format out in prose,
and it uses brackets — "Sent as repeated `expand[]` query params (e.g.
`expand[]=service_materials&expand[]=service_labor_rates`)" — repeated verbatim in the 2026-06-29
changelog entry. Its sibling `filters` parameter is `style: deepObject` over `filters[][property]`,
bracketed too. Yet that same `expand` parameter *also* carries `style: form, explode: true`, which is
OAS for the unbracketed `expand=a&expand=b`, and every other array parameter declares no style at all
(so OAS defaults it to the unbracketed form).

The prose wins because the backend is Rails — `Authorization: Token`, Doorkeeper at `/oauth/token`,
and `x-runtime` / `x-request-id` response headers, all observed live. Rack's parser keeps only the
**last** value of a repeated bare key, while `name[]` is exactly its array syntax. Under the
machine-readable reading a two-value filter would silently narrow to one and still return 200, which
is the worst available failure mode.

`lib/client.ts#buildQuery` implements it once and `tests/index.test.ts` pins it, so switching back is
a deliberate act rather than an accident.

### Three pagination envelopes

1. **Core** — `{page, page_size, total_pages, total_items, <plural resource name>: [...]}`, where the
   collection key differs per endpoint (`customers`, `jobs`, `line_items`, `statuses`, …).
2. **Price book** — `{object, page, page_size, total_pages_count, total_count, data: [...], url}`.
   Different count field names *and* a generic `data` key.
3. **None at all** — `GET /jobs/{job_id}/line_items` answers `{url, data: [...]}`,
   `/jobs/{job_id}/appointments` answers `{appointments: [...]}`, `/jobs/{job_id}/invoices` answers
   `{invoices: [...]}`, `/api/price_book/services` answers `{services: [...]}`.

`normalizeList` folds all three into one `{items, page, pageSize, totalPages, totalItems}` result, so
a workflow paging through records does not branch per endpoint. Where the vendor sends no page
fields, they come back `undefined` rather than invented.

### Five error body shapes

| Shape | Where |
|---|---|
| `{"message": "Unauthorized"}` | every 401, measured live |
| `{"error": {"message": "…"}}` | `ErrorResponse` — job lock 404, lead line-items 404, estimate-option 404 |
| `{"error": "…"}` (a bare string) | `PUT /pipeline/statuses` 404 |
| `{"errors": {"field": ["is invalid"]}}` | 422 validation |
| `{"message": "…", "attr1": ["…"]}` | 400, with per-attribute detail beside the sentence |

`formatHousecallError` reads all five. The 422 map is tried first: it is the only part of that body
worth having, and a formatter that read the flat `message` first would drop the field name.

### One endpoint spells its page size `per_page`

`GET /routes` takes `per_page`; every other list takes `page_size`. Sending the wrong one is silently
ignored and returns ten rows. `route-list` therefore declares `perPage` explicitly rather than using
the shared pagination fragment, and a test asserts `page_size` never appears in its query string.

### `GET /job_fields/job_types` returns a pagination envelope it cannot page

The response carries `page` / `page_size` / `total_pages` / `total_items`, but the operation declares
no `page` or `page_size` parameter — `name` is the only documented filter. `job-type-list` sends no
pagination rather than inventing parameters.

### Multi-location: `X-Company-Id`, not `location_ids`

`docs/franchise.md` documents both and states the precedence: "when both `location_ids` and the
X-Company-Id header are used together the `location_ids` parameter will be ignored", and recommends
migrating to the header. So this app exposes **only** the header, as a `companyId` param on every
action, and no `location_ids` parameter anywhere — one control, no silent precedence rule for a user
to trip over.

Access rules worth knowing: a key reaches its own location and every location beneath it in the
hierarchy, never a sibling or a parent. Under OAuth it is narrower still — the authorising *user's*
accessible-organizations permission applies, and a request naming a location they cannot reach
returns 403.

---

## Health checks

| Check | Kind | Severity | What it reads |
|---|---|---|---|
| `service` | `service` | `informational` | `status.housecallpro.com/api/v2/summary.json` |
| `api` | `dependency` | default | unsigned `GET https://api.housecallpro.com/company` |
| `quota` | `quota` | `informational` | declared absence |
| `auth:api-key`, `auth:oauth2` | derived | — | projected from the two `test` hooks |

### The status page is real, but it does not cover this API

Verified three ways on 2026-08-11:

| Path | Status | Bytes |
|---|---|---:|
| `/api/v2/summary.json` | 200 | 6,858 |
| `/api/v2/status.json` | 200 | 242 |
| `/api/v2/incidents.json` | 200 | 276,368 |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** |

Four different answers and a refused nonsense path, so it is not a catch-all. It self-identifies —
`"page": {"id": "b9cs969t77x0", "name": "Housecall Pro"}` — and it is maintained: 50 incidents with
real per-component attribution, most recently 2026-07-02.

And yet **none of its nineteen components covers `api.housecallpro.com`**. They are: Pro web, Payment
processing - Stripe, QuickBooks Online, QuickBooks Desktop, Text notifications, Email notifications,
Online booking, Google calendar, Consumer web, **Add a job API**, iOS Mobile App, Android mobile app,
Customer job preview, Wisetack, Responsibid, Reviews, Voice, Chat, CSR AI.

"Add a job API" is the trap. It is the **Partner Jobs API** — the separate intake surface documented
at `docs.housecallpro.com/docs/partner-jobs`, which lets home-warranty and lead-generation companies
push work orders into Housecall Pro's network. Different product, different credentials, different
reference; no action in this app calls it. The incident history agrees: of the five most recent
incidents, two were attributed to `CSR AI`, one to `Voice`, and two to `Pro web` plus the mobile
apps — none to any API surface.

So `service` is pinned to **`severity: "informational"`**. The reading is published because it is
what the vendor says about its own platform, and it is barred from moving the app's verdict because
it is not about the surface this app uses. It stays a live probe rather than a declared absence: the
day Housecall Pro adds a public-API component, it starts producing the right signal with no code
change.

### `api` — a 401 is the pass

The `api` check is what actually reports on the host the actions use. It sends **no credential**, so
Housecall Pro rejects it:

```
HTTP/2 401
content-type: application/json; charset=utf-8
x-runtime: 0.008927
{"message":"Unauthorized"}
```

That rejection, in the vendor's own JSON error shape, is the strongest evidence available that the
service is healthy: DNS resolved, TLS terminated, the Rails router matched `/company`, and the
authentication filter ran. Judging by the HTTP status would report Housecall Pro permanently down.

A 401 **without** that JSON body is a `down` — something other than the API answered. A 2xx is
`degraded` rather than a pass: `/company` is documented as requiring a credential, so it answering
without one would be a regression, not good news.

This check says nothing about anybody's credential. That is the derived `auth:*` checks' job, and
conflating the two is how "Housecall Pro had an outage" gets misreported as "your key expired".

### `quota` — a declared absence, stated as a fact

Housecall Pro publishes no readable rate-limit headroom. Verified two ways:

- **Nothing on the wire.** Twelve consecutive unauthenticated requests inside one minute produced
  twelve 401s, no 429, and no `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` or
  `Retry-After` on any of them. The response headers are `date`, `content-type`, `status`,
  `cache-control`, `vary`, `strict-transport-security`, `referrer-policy`,
  `x-permitted-cross-domain-policies`, `x-xss-protection`, `x-request-id`, `x-runtime`,
  `x-frame-options`, `x-content-type-options`.
- **Nothing in the documentation.** The 222 KB specification mentions rate limiting exactly once, as
  prose on one endpoint: `POST /jobs/{job_id}/line_items` is "a rate limited request. If you intend
  to create multiple line items for the same job use Bulk update a job's line items request." No
  number, no window, no header, no consumption endpoint. The four prose pages mention it not at all.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app at `unknown`
forever.

That one rate-limit sentence *is* acted on — `job-line-item-create` says in its own description that
adding several items to one job is what the vendor's bulk endpoint is for, rather than a loop.

---

## Deliberately left out, and why

These are omissions, not oversights. Each is an endpoint the reference lists that this app does not
implement.

- **`POST` / `DELETE /webhooks/subscription`.** The request body's schema in the specification is
  literally `{"type": "object"}` with no properties, and `docs/webhooks.md` never documents a
  subscription payload at all — it says webhooks are enabled by contacting Housecall Pro support or
  emailing `apideveloper@housecallpro.com` with your URL. There is no way to build a correct request
  from the published material, so these are out.
- **Every attachment endpoint** — `POST /jobs/{job_id}/attachments`,
  `POST /estimates/{estimate_id}/options/{option_id}/attachments`. The 2024-04-24 changelog entry
  records a breaking change: "POST attachment endpoints now only accept binary files from local
  machine". A request body cannot carry binary through this sandbox (the runtime worker stringifies
  it), so a multipart file part is out of scope for any app in this pack.
- **`GET /checklists`.** Its `job_uuids` and `estimate_uuids` query parameters are **both** marked
  `required: true`, while the operation's own description says "Most provide at least one job_uuid or
  estimate_uuid". Those cannot both be true, and picking a reading would be guessing at which.
- **`filters` on `GET /api/price_book/services`.** A `style: deepObject` triple
  (`filters[][property]` / `[][operator]` / `[][value]`) that `buildQuery` does not implement.
  Exposing a parameter that silently serialized wrong would be worse than not having it. The `expand`
  parameter on the same endpoint *is* exposed, because its form is documented and simple.
- **The bulk update endpoints** (`PUT …/line_items/bulk_update`, `PUT …/job_input_materials/
  bulk_update`), **`PUT /company/schedule_availability`**, **`PUT /pipeline/statuses`**,
  **`PATCH /company/franchise_info`**, the price-book **materials / material-categories / price-forms
  CRUD**, `POST /estimates`, job/estimate **lock**, appointment create/update/delete, note and tag
  deletes, and `GET /api/invoices/{uuid}/preview` (which returns HTML, not JSON). All are fully
  documented and correct to add later; they were scoped out of this first version, not blocked by
  anything.
- **The Partner Jobs API** (`docs.housecallpro.com/docs/partner-jobs`) is a separate product with its
  own reference and its own credentials. It is not part of this app.

---

## Icon

`assets/icon.png` is Housecall Pro's own `apple-touch-icon.png`, downloaded **verbatim**:

| | |
|---|---|
| Source | `https://www.housecallpro.com/apple-touch-icon.png` |
| Size | 4,002 bytes |
| Type | `image/png`, 180×180, 8-bit RGBA, non-interlaced |
| md5 | `5e2761c440ee7f4572766682283da4ad` |
| sha256 | `b0a379bd19cde48a786300bda3454eec5f9b60c85e518418f791a2003f8c5b6a` |

A genuine vendor **SVG** exists and was found, byte-verified, and deliberately not used:
`https://static-assets.housecallpro.com/brand/logos/square-door-only.svg`, 1,035 bytes, md5
`fe1537f2af8cc68f208b839e49652b5e` — the file Housecall Pro's own documentation site names as its
workspace `logoUrl`, so its provenance is not in doubt. It declares `width="486.53"`
`height="486.53"` and **no `viewBox`**, which means it cannot be scaled into an icon slot without
editing it — and editing it would forfeit the verbatim claim. The PNG is used instead, and the SHA-256
above is asserted in `tests/index.test.ts` so a silent substitution fails the suite.

---

## Development

```bash
# from packages/apps/apps/housecallpro (Deno lives in the api container)
deno task validate   # manifest + spec conformance
deno task check      # typecheck
deno task lint
deno task fmt
deno task test
```

The unit tests call every hook with a mocked `HookContext` — a fake `ctx.fetch` that queues responses
and records requests, and a no-op `ctx.log`. No network, no server.
