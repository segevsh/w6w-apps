# Zoho People

Read and write Zoho People HR data: forms and employee records, attendance check-in/out, leave, and
time-tracker time logs and timesheets.

Scoped to **Zoho People specifically**. This pack also ships `zoho` (CRM), `zohobooks`, `zohodesk`
and `zoho-recruit` — separate products with separate APIs.

- **Categories** — hr
- **Auth methods** — oauth2, one per Zoho data centre (`oauth2-us`, `-eu`, `-in`, `-au`, `-jp`,
  `-cn`, `-sa`, `-ca`, `-sg`, `-ae`)
- **Actions** — 19
- **Egress allowlist** — `people.zoho.com`, `.eu`, `.in`, `.com.au`, `.jp`, `.com.cn`, `.sa`,
  `people.zohocloud.ca`, `.sg`, `.ae`
- **Website** — https://www.zoho.com/people/
- **API docs** — https://www.zoho.com/people/api/overview.html

## Actions

| Area       | Actions                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| Forms      | list forms, get form fields, list form views                                    |
| Records    | list records (bulk), list records by view, create, update — any form            |
| Employee   | get employee (by email or Employee ID)                                          |
| Attendance | get attendance entries, check in / check out                                    |
| Leave      | get leave types & balances, apply leave, cancel leave, get holidays            |
| Time track | list jobs, list projects, list time logs, add time log, list timesheets        |

Employee and Leave are just forms (`employee`, `leave`), so `record-list` / `record-create` /
`record-update` already cover them and any custom form; `employee-get` and `leave-apply` exist because
those two have fixed, documented shapes worth a typed action.

**Deliberately absent** (trimmed rather than guessed): Attendance Bulk Import, Attendance
check-in/out *update*, timesheet create/modify/approve/delete, timer start/pause/stop, time-log
modify/delete, time-tracker client/project/job write APIs, Get Clients (admin-only), and the
Zoho-side form/field *creation* APIs. Their pages were either not found under the docs' URL scheme or
are outside core HR automation.

## Regional data centres

Zoho hosts each People account in one of **ten** data centres, and the OAuth host is baked into the
authorize flow, so each region is its own auth method — pick the one matching the accounts host you
sign in on. Each region's `afterConnect` records its fixed `apiHost` on the connection, and every
action reads it back.

The vendor's OAuth page lists only six accounts hosts (US, AU, EU, IN, CN, JP). Live probing on
2026-10-06 found ten: `GET /people/api/forms` against every `people.zoho.<tld>` answered Zoho People's
own JSON error envelope, for `.com .eu .in .com.au .jp .com.cn .sa .sg .ae` and `people.zohocloud.ca`.
`people.zoho.ca` and `people.zoho.com.sg` do not connect. **Canada is the odd one**: API host
`people.zohocloud.ca`, OAuth host `accounts.zohocloud.ca`.

The token response's `api_domain` is `https://www.zohoapis.<tld>` — **not** where People lives. Call
`people.zoho.<tld>`.

## Auth

OAuth 2.0 authorization-code with `access_type=offline&prompt=consent` (without them no refresh
token; access tokens last one hour). Register a client in the Zoho API console for your data centre
and store its credentials via `PUT /apps/:id/oauth-config/oauth2-<region>`. Scopes requested:
`ZOHOPEOPLE.forms.ALL`, `ZOHOPEOPLE.leave.ALL`, `ZOHOPEOPLE.attendance.ALL`,
`ZOHOPEOPLE.timetracker.ALL`. The header is `Authorization: Zoho-oauthtoken <token>`, stamped only in
`sign`.

**Not verified live:** the docs name the fetch-forms / components scope `ZOHOPEOPLE.form.READ` (singular)
while the scope table lists only `forms.*`. This app requests `forms.ALL`; if a connection reports a
scope error on List Forms / Get Form Fields, that mismatch is the first suspect. Everything above was
checked against the docs and unauthenticated probes only — no live OAuth account was available.

## Health check

| Key                    | Kind       | Severity      | Probe                                                                       |
| ---------------------- | ---------- | ------------- | --------------------------------------------------------------------------- |
| `service`              | service    | degraded      | Zoho StatusIQ RSS (`us.zohostatus.com/rss`), component `Zoho People`       |
| `quota`                | quota      | informational | declared unavailable                                                        |
| `auth:oauth2-<region>` | credential | fatal         | derived from each method's `test`: `GET /people/api/forms`                  |

- **Vendor status** — `us.zohostatus.com/rss` is a real StatusIQ page with one `"{component} - {status}"`
  item per Zoho product; `"Zoho People - Operational"` was present on 2026-10-06 and is matched by
  exact component name (not `Zoho Recruit`, `Zoho CRM`…). The feed host is allowlisted implicitly and
  deliberately not on `network.allow`.
- **Credential probe** — `GET /people/api/forms` lists form names and permissions only and never
  echoes the credential. It is classified by the vendor's error `code`, not the HTTP status (see
  below), and a `2xx` that carries an error code is not ok.
- **Quota** — Zoho documents daily allowances per plan (250 calls per user licence, capped 5,000 /
  10,000 / 15,000 / 25,000) and per-endpoint per-minute thresholds with lock periods, but sends no
  `X-RateLimit-*` header (response headers inspected 2026-10-06). Declared unavailable with
  `severity: "informational"` so it cannot pin the app at `unknown`.

## Findings worth a day saved

1. **There is no single response envelope.** Forms/leave/time-tracker wrap in
   `{"response":{"result":…,"status":0}}`; Fetch-by-View and Attendance Entries answer a *bare*
   array/object; the newer `/api/v2/…` family (Cancel Leave) answers `{"message","status":"success"}`
   and fails as `{"error":{…}}`. Get Bulk Records additionally keys every row by its record id
   (`[{"759415…":[{…}]}]`) — `record-list` flattens that to `recordId` + fields. `lib/client.ts#unwrap`.
2. **Errors do not follow HTTP conventions or one shape.** A missing/blank credential is HTTP **400**
   code `7202`; a dead token is HTTP 401 code `7213`; `response.errors` is an object on forms but an
   **array** on time tracker; and a failure can arrive inside a 2xx as `response.status: 1`. The client
   throws on all of these and surfaces the vendor's `code`.
3. **Writes take `inputData` as a JSON *string* in a form field, keyed by the form's *label* names**,
   not the API names you get back on reads (reads return `FirstName`/`EmployeeID`-style keys; bulk
   records and by-view records use different key styles again — display labels in the by-view
   endpoint). Use Get Form Fields to find the names. Also: the docs' Get Bulk Records page says
   `slIndex` in the parameter table but `sIndex` in the URL and curl sample — this app sends `sIndex`;
   Add Time Log's documented URL is missing an `&` before `workItem`; and form records index from
   1 while time-tracker endpoints index from 0.

## Icon

`assets/icon.svg` is the verbatim Zoho mark, copied byte-for-byte from `apps/zoho-recruit/assets/icon.svg`
(itself identical to `apps/zoho/assets/icon.svg`; a test pins that). No Zoho People–specific mark was
used.

---

Researched 2026-10-06 against https://www.zoho.com/people/api/ (overview, oauth-steps, scopes,
api-limits, bulk-records, fetch-record, insert-records, update-records, forms-api/fetch-forms,
forms-api/get-field-forms, fetch-view, add-leave, leave-types, cancel-leave, holiday,
attendance-entries, attendance-checkin-checkout, timesheet/get-timelogs, get-jobs, get-projects,
get-timesheets, add-timelogs) plus unauthenticated probes of all ten regional hosts.
