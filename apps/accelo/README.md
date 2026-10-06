# Accelo

Work with Accelo PSA: companies, contacts, activities and time, tasks, jobs, issues, requests, prospects, invoices and staff.

- **Categories** — project-management, crm, productivity
- **Auth methods** — client-credentials (Service Application)
- **Actions** — 34
- **Egress allowlist** — `*.api.accelo.com`
- **Website** — https://www.accelo.com
- **API docs** — https://api.accelo.com/docs/ (the older `affinitylive.jira.com` link is stale)
- **Icon** — `assets/icon.svg` is Accelo's own primary logo, byte-for-byte from
  `cdn.prod.website-files.com/69d7c04e3adaa4efae2171e5/6a554f7b2a723e3e8ecd4e33_Accelo_Logo-Primary.svg`
  (the link in the `<img>`/logo markup of accelo.com on 2026-10-06). It is the wordmark lockup (654x150),
  not the square symbol — Accelo serves no standalone SVG favicon (`/favicon.svg` is a 404 and the page's
  icons are 32/256px PNGs of a different, "acello", mark).

## Connecting

Accelo gives every customer its own host, `{deployment}.api.accelo.com`, so a connection is three values:

1. In Accelo go to **Configuration → API → Register Application** and register a **Service Application**.
2. Paste the **deployment** (just the subdomain — `acme` from `acme.api.accelo.com`), the application's
   **client id** and its **client secret**.
3. Leave **scope** at `write(all)` or narrow it (`read(all)`, `read(all),write(companies,contacts)`). Accelo's own
   default is `read(all)`, which cannot write — so this field defaults to `write(all)` instead.

The app exchanges those for a bearer token (`POST /oauth2/v0/token`, client id and secret in HTTP Basic,
`grant_type=client_credentials`; default lifetime 30 days) and signs every call with it. A service application has
no refresh token, so refreshing is the same exchange again.

### Egress: why a wildcard

The manifest cannot list every customer's host, so `network.allow` is `*.api.accelo.com` — any subdomain of
it, nothing else (the apex `api.accelo.com` serves only the docs). The deployment is validated as a single DNS
label (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`) before it is ever put in a URL, so a pasted
`evil.com/x` or `a.b` is refused rather than turned into a request.

Web and Installed applications (authorization-code grant against the customer's own host) are **not**
built: the static `oauth2` auth type cannot address a per-customer authorize/token URL.

## Actions

| Resource | Actions |
|---|---|
| Companies | `company-create`, `company-get`, `company-list`, `company-update` |
| Contacts | `contact-create`, `contact-get`, `contact-list`, `contact-update` |
| Activities (notes, calls, meetings, time) | `activity-create`, `activity-get`, `activity-list` |
| Tasks | `task-create`, `task-get`, `task-list`, `task-update` |
| Jobs (projects) | `job-create`, `job-get`, `job-list`, `job-update` |
| Issues (tickets) | `issue-create`, `issue-get`, `issue-list`, `issue-update` |
| Requests | `request-create`, `request-get`, `request-list` |
| Prospects (sales) | `prospect-create`, `prospect-get`, `prospect-list`, `prospect-update` |
| Invoices | `invoice-get`, `invoice-list` |
| Staff | `staff-get`, `staff-list` |

Lists take `search`, a raw `filters` expression (`standing(active),date_created_after(1490140800)`), an order
(`order_by_asc|desc(field)`), `fields` (`_fields`) and paging. They return
`{ items, page, limit, hasMore }`; `hasMore` is true when the page came back full. Every read and write
accepts `fields` to ask for optional fields or linked objects (`_ALL`, `postal_address(city)`), because Accelo
returns only a small default set. Dates are **Unix timestamps in seconds**; durations are seconds.

Writes are sent `application/x-www-form-urlencoded`, which every example in the reference uses. An update with
no field set is refused before any request. Creates are marked non-idempotent: Accelo mints a new id per POST and
documents no idempotency key.

### Not covered

Deletes (`DELETE` on companies, contacts, jobs, issues, prospects, activities), affiliations, contracts,
quotes, expenses, payments, purchases, assets, checklists, milestones, object budgets and schedules, profile and
extension (custom) field values, progressions, webhooks, tags, and file attachments on activities. Activity
interactions (`to`/`cc`/`bcc` recipients) are also left out: the reference documents them only as a JSON
fragment. Writing a custom field, or progressing an object through its workflow, needs those endpoints.

## Health check

### Is the vendor up?

**Service status** — <https://status.accelo.com>, an Atlassian Statuspage. `GET /api/v2/summary.json` is
pinned to page id `m0sbzc18yt4n` (the page reads `name: Accelo`). The page publishes **no components**, only one
rollup indicator, so nothing on it is specifically the API; the check is declared `informational` for that
reason, and a mismatched page or a failing status API reports `unknown`, never `down`.

### Is this credential live?

The auth `test` hook calls `GET /api/v0/tokeninfo`: the token owner's email, name, staff id and deployment — it
never echoes the token or the secret, and needs no resource scope, so a narrowly scoped credential is not
reported broken. The verdict comes from the body's `meta.status`, not the HTTP code.

### Does this account's host answer?

An unsigned `GET /api/v0/tokeninfo` against the connection's deployment. Verified live 2026-10-06: a real
deployment (`accelo`) answers `401 {"meta":{"status":"invalid_client",…}}` and an unknown one answers
`400 … "Deployment 'x' was not found."`. The 401 **passes** (the host is serving); the 400, a 5xx and a
transport failure are down.

### Do we have quota left?

Accelo allows **5000 requests per hour per deployment** (the `/oauth2` endpoints are exempt) and documents
`X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (a Unix timestamp). They were not present on
the unauthenticated 401 probed live, and this build had no credential to confirm them on a signed answer, so a
response without them reports `unknown`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | 60s | `health/service.ts` |
| `deployment` | dependency | connection | context | degraded | 120s | `health/deployment.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:client-credentials` | credential | connection | signed | fatal | — | derived from the auth method's `test` hook |

## Vendor quirks worth knowing

- **Two error shapes.** The resource API answers `{"meta":{"status","message"},"response"}`; the OAuth endpoints
  answer RFC 6749 `{"error","error_description"}`. A `200` can still carry a non-`ok` `meta.status`, so the client
  checks the body.
- **Ids and counts are strings on the wire** (`"id":"1002"`, `"expires_in":"2592000"`); the output schemas
  declare ids as strings and the token lifetime is coerced with `Number`.
- **`_page` is zero-based, default page size is 10, max 100.** This app defaults to 50 so a bare list is useful.
- **Doc inconsistencies.** The `Create a Request` reference shows `subject`/`title` swapped between its JSON
  example and its field table; this app follows the table and the curl example (`title`, `body`).
  Required-field markers are mostly absent from the reference, so only fields the examples always send are marked
  required here and Accelo's own validation is the backstop.
- **Not exercised against a live account.** No Accelo credential was available, so request shapes are taken from
  the reference and the host/error behaviour was confirmed unauthenticated; every mocked test pins the documented
  shape, not a recorded response.
