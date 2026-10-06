# AccuLynx

Jobs, contacts, appointments, estimates and invoices on **AccuLynx**, the job-management and CRM
platform for roofing and exterior contractors, over its v2 REST API.

- **Categories** — crm
- **Auth methods** — bearer-token (API key)
- **Actions** — 29
- **Health checks** — `service`, `ping`, ~~`quota`~~ (declared unavailable) + the derived
  `auth:bearer-token`
- **Egress allowlist** — `api.acculynx.com` (the `service` check adds `status.acculynx.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://acculynx.com/
- **API docs** — https://apidocs.acculynx.com/reference/
- **Status page** — https://status.acculynx.com/

> Everything below was verified on 2026-10-06 against AccuLynx's own API reference (a ReadMe site
> whose server-rendered pages embed the full OpenAPI document, v2.2614.0, 105 paths) plus live
> unauthenticated probes of `api.acculynx.com` and `status.acculynx.com`. Nothing came from a
> third-party integration directory. No call was made with a real API key.

## Read this before you build on it

### API keys are for AccuLynx customers only, and there is no sandbox

AccuLynx's reference says it plainly: "API keys are for our customers only." A company integrating
on a customer's behalf must request access through AccuLynx's own form first, and doing otherwise
"can result in suspension of the AccuLynx account." The reference's "virtual server" is a mock that
returns one fixed response regardless of input. The real API has no test mode: every call, including
every create and update here, hits the customer's production data.

### Pagination is spelled two ways

Every list response reports `count`, `pageSize` and `pageStartIndex` (a zero-based **record** index,
not a page number). But the **request** parameter that sets it differs per endpoint: jobs, calendars,
appointments, lead sources, job representatives, job estimates and a contact's jobs take
`recordStartIndex`; contacts, users, contact types and job invoices take `pageStartIndex`. The wrong
one is silently ignored and you get page one forever. Every list action here takes one `startIndex`
and maps it to the right name (`lib/params.ts`). Jobs and job search cap `pageSize` at 25 (default
10).

### There is no "update job", "job status" or "leads" resource

This API has no `/leads` list or create (a lead is a job in the **Lead** milestone: Create Job makes
one, always unassigned), no job-level `PUT`, and no endpoint that sets a milestone or status. Jobs
change through per-field sub-resources (address, priority, category, work type, trade types, lead
source, insurance, ...); this app covers address. Unassigned leads are also **hidden** from Get Job,
Search Jobs and List Jobs unless `assignment=unassigned`.

### Update Contact wants lastName and contactTypeIds every time

The contact `PUT` documents `lastName` and `contactTypeIds` as required, so `contact-update` refuses
to run without them. Use `contact-type-list` to find type ids. Phone numbers, emails and notes are
separate sub-resources that this endpoint does not touch. AccuLynx answers updates with 204 and
some creates with 201 and no body; those come back as `{ "success": true }`.

## Auth

One method: `bearer-token` — `Authorization: Bearer <API key>`, from
https://my.acculynx.com/apikeys.

### The probe is `GET /company-settings`, not `/diagnostics/ping`

`GET /diagnostics/ping` answers `200 {"date": ...}` with **no key at all** (measured), so it proves
nothing about a credential and is used only as the credential-free reachability check. The auth test
reads `/company-settings` instead: it needs a key, takes no parameters, and returns only the company
id, name, time zone and an insurance flag, never the key.

A rejected key is recognised by the **body** — problem+json with `title` "API Key is invalid or
deactivated." (measured live) — not by the status code. A 429 is evaluated after authentication, so
the test treats it as proof the key was accepted.

## Actions

| Key | Type | Title | Endpoint |
| --- | --- | --- | --- |
| `appointment-get` | read | Get Appointment | `GET /calendars/{calendarId}/appointments/{appointmentId}` |
| `appointment-list` | read | List Calendar Appointments | `GET /calendars/{calendarId}/appointments` |
| `calendar-list` | read | List Calendars | `GET /calendars` |
| `company-settings-get` | read | Get Company Settings | `GET /company-settings` |
| `contact-create` | perform | Create Contact | `POST /contacts` |
| `contact-get` | read | Get Contact | `GET /contacts/{contactId}` |
| `contact-jobs-list` | read | List Contact Jobs | `GET /contacts/{contactId}/jobs` |
| `contact-list` | read | List Contacts | `GET /contacts` |
| `contact-note-create` | perform | Add Contact Note | `POST /contacts/{contactId}/notes` |
| `contact-search` | search | Search Contacts | `POST /contacts/search` |
| `contact-type-list` | read | List Contact Types | `GET /contacts/contact-types` |
| `contact-update` | perform | Update Contact | `PUT /contacts/{contactId}` |
| `country-list` | read | List Countries | `GET /acculynx/countries` |
| `estimate-get` | read | Get Estimate | `GET /estimates/{estimateId}` |
| `invoice-get` | read | Get Invoice | `GET /invoices/{invoiceId}` |
| `job-create` | perform | Create Job | `POST /jobs` |
| `job-estimates-list` | read | List Job Estimates | `GET /jobs/{jobId}/estimates` |
| `job-get` | read | Get Job | `GET /jobs/{jobId}` |
| `job-invoices-list` | read | List Job Invoices | `GET /jobs/{jobId}/invoices` |
| `job-list` | read | List Jobs | `GET /jobs` |
| `job-message-create` | perform | Post Job Message | `POST /jobs/{jobId}/messages` |
| `job-milestone-current` | read | Get Current Job Milestone | `GET /jobs/{jobId}/milestones/current` |
| `job-representatives-list` | read | List Job Representatives | `GET /jobs/{jobId}/representatives` |
| `job-search` | search | Search Jobs | `POST /jobs/search` |
| `job-update-address` | perform | Update Job Address | `PUT /jobs/{jobId}/address` |
| `lead-source-list` | read | List Lead Sources | `GET /company-settings/leads/lead-sources` |
| `state-list` | read | List States | `GET /acculynx/countries/{countryId}/states` |
| `user-get` | read | Get User | `GET /users/{userId}` |
| `user-list` | read | List Users | `GET /users` |

`resource` groups them in the editor. Lists answer `{count, pageSize, pageStartIndex, items}`.
List Jobs and Search Jobs return summaries; `includes=contact` expands the contacts inline.

## Health checks

- **`service`** — AccuLynx runs a real Atlassian Statuspage (`page.id` `plnhlfldnnpp`, `page.name`
  "AccuLynx"). It has a top-level component named exactly **"API"** (`kpktrjhb5pxz`), and that
  component alone drives the verdict; "Web Application", "Mobile Application", email, and the
  Add-Ons group (AccuFi, AccuPay, EagleView, QuickBooks Online, ...) are reported for visibility
  only.
- **`ping`** — unsigned `GET /diagnostics/ping`; `200` with a `date` field (or a schema-correct 401,
  should AccuLynx put it behind the key) is a pass. A 200 without `date` is `down`.
- **`quota`** — declared `unavailable`, severity `informational`. The reference defines `RateLimit-*`
  and `Retry-After` headers but documents them only on the 429 response (where remaining is always
  0), and publishes no headroom endpoint. Whether a 200 carries them could not be checked without a
  key. Rate limits are per company with named policies such as `company-write:hourly` and
  `company-write:daily`; a 429 body is `text/plain`, not JSON.

## Not yet covered

Verified to exist in the reference and left out of this first pass, not guessed at:

- Job sub-resources: contacts list, history, financials, payments (read + create received/paid/
  expense), accounting integration status, insurance and adjuster, initial appointment
  (get/put/delete), milestone history, milestone/status by id, sales owner / A/R owner / company
  representative (get/post/delete), priority, job category, work type, trade types and lead-source
  updates, custom fields, external references, documents, photos/videos and measurement uploads
  (multipart or multi-step).
- Contacts: email addresses and phone numbers (list/create/get), custom fields, contact logs.
- Estimates: sections and items. Invoices list. Financials, worksheets and amendments, supplements.
- Company settings: document folders, photo/video tags, account types, company countries/states,
  insurance companies, job categories, trade types, work types, workflow milestones and statuses,
  custom field definitions, lead source by id. Lead history. Scheduled reports and runs. Units of
  measure and single country/state lookups.
- Webhook subscriptions (`/subscriptions`, `/topics`) are listed in the reference's navigation but
  have no path in the OpenAPI document, so they were not verified.

## Icon

`assets/icon.png` is AccuLynx's own apple-touch-icon, downloaded **verbatim** from
`https://acculynx.com/apple-touch-icon.png` (180x180 PNG, 5446 bytes, md5
`8ecc86f6ffaf71118d4834d44962a256`). `https://acculynx.com/favicon.svg` returns 404, so no SVG mark
exists to use. Nothing was redrawn or recoloured.

## Layout

```
acculynx/
├── package.json  index.ts  deno.json  tsconfig.json
├── actions/   one file per action
├── auth/bearer-token.ts
├── health/    service.ts  ping.ts  quota.ts
├── lib/       client.ts (HTTP + errors)  params.ts (paging/includes helpers)
├── assets/icon.png
└── tests/     mocked-HookContext unit tests, one file per module
```

Run from this directory: `deno task validate && deno task check && deno task lint && deno task fmt &&
deno task test`.
