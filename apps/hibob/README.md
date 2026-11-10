# HiBob (Bob)

Read and manage people, time off, tasks, reports and attendance in [HiBob](https://www.hibob.com)
through Bob's public API. Verified against the reference at https://apidocs.hibob.com/ (the
`.md` exports and embedded OpenAPI, read 2026-10-06).

- **App id:** `io.w6w.hibob` · **Base URL:** `https://api.hibob.com/v1` (the only `network.allow`
  host). A separate sandbox host, `api.sandbox.hibob.com`, exists but is not allowlisted.
- **Auth:** one method, `service-user` (HTTP Basic). The username is the service user **ID**, the
  password its **token**; `sign` builds `Authorization: Basic base64(id:token)`. OAuth 2.0 is for
  approved marketplace partners only and is not offered.
- **Liveness:** no deprecation or sunset notice applies to any endpoint used here. The reference
  marks only the legacy `GET /payroll/history` as planned for deprecation; it is not used.
- **Triggers** — 7 (poll)

## Permissions are part of the contract

A new service user can read nothing. It must be added to a permission group with the right
**features**, **people's fields** (View, plus View history for table history) and an **access data
for** audience. Bob then *omits* fields and employees the user cannot see **with a 200** and no
warning, so compare what you asked for with what came back.

## Actions (27)

| Area | Actions |
| --- | --- |
| People | `people-search`, `person-get`, `profiles-list`, `person-create`, `person-update`, `person-terminate` |
| Metadata | `fields-list`, `named-lists-list`, `named-list-get` |
| Onboarding | `onboarding-wizards-list` |
| Employee tables | `work-history-list`, `employment-history-list`, `lifecycle-history-list` |
| Time off | `timeoff-request-create`, `timeoff-request-get`, `timeoff-request-cancel`, `timeoff-requests-changes`, `timeoff-whosout`, `timeoff-outtoday`, `timeoff-balance-get`, `timeoff-policy-types-list` |
| Tasks | `tasks-list`, `tasks-person-list`, `task-complete` |
| Reports | `reports-list`, `report-download` (JSON or CSV text) |
| Attendance | `attendance-entries-search` |

People search is a **POST** (`/people/search`), uses dot-notation field ids (`root.id`,
`work.department`; list them with `fields-list`), returns every match in one response (**no
pagination**, max 400 field ids), and only filters on `root.id` / `root.email` with `equals`.
`filters` is omitted when empty because `filters: []` is a 400. `person-update` takes the **nested**
shape search returns, not dotted ids.

## Health checks

- **`auth:service-user`** (derived from `test`): signed `GET /v1/company/people/fields`. The
  reference says it needs no permissions, and its body is field metadata that never echoes the ID
  or token. A 200 only passes if the body is the documented list of field definitions; an
  unauthenticated call returns **401 with an empty body** (measured), so there the status is the
  only signal.
- **`quota`** (informational): reads `X-RateLimit-Limit/-Remaining/-Reset` (seen live, even on a
  401). Limits are **per endpoint per minute** (50 for people search and for the fields metadata
  endpoint, 40 for profiles), so this reports the probe endpoint's bucket, not an account total.
- **`service`**: `https://status.hibob.io/api/v2/summary.json`, an Atlassian Statuspage (page id
  `4427wk0x9t9k`, name "HiBob"). It rolls up ~45 components (payroll, hiring, learning ...), so the
  page indicator is ignored and the verdict is the **`Public API`** component
  (`6q9wcj8f00bt`). `status.hibob.com` does not resolve; `hibob.statuspage.io` serves the same
  document. The final host `status.hibob.io` is declared on the check, not in the manifest.

## Not covered

Employee tables other than work/employment/lifecycle (salaries, equity, variable pay, training,
dependents, custom tables), people bulk-table endpoints, avatars, field and list *writes*, email
change/invite/uninvite/start-date, the five other time-off request shapes (`portionOnRange`,
`hoursOnRange`, the three duration-list shapes), balance adjustments, attendance writes and
projects, documents, goals, skills, job catalog, workforce planning, hiring, learning, payroll,
webhooks and `xlsx` report download (binary). Salary and other payroll-grade tables were left out
deliberately rather than shipped half-checked.

## Icon

Vendor's own current mark, embedded as a base64 PNG in an SVG wrapper:
https://new.hibob.com/app/uploads/2026/05/cropped-HiBob-Logo-Icon-192x192.png (the simple-icons
`hibob.svg` is the older "Hi Bob" wordmark and no longer matches the brand).

## Develop

```
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

## Triggers

| Key — title | Mechanism | Wrapped action | What the run gets |
|---|---|---|---|
| `new-task` — New Task | poll | `tasks-list` | Each open task added (bounded 5,000-task response) |
| `new-employee` — New Employee | poll | `people-search` | Each employee added to Bob |
| `new-or-updated-employee` — New or Updated Employee | poll | `people-search` | Each employee that is new or whose returned fields changed |
| `new-work-history-entry` — New Work History Entry | poll | `work-history-list` | Each work-table entry added for the chosen employee |
| `new-employment-history-entry` — New Employment History Entry | poll | `employment-history-list` | Each employment-table entry added for the chosen employee |
| `new-lifecycle-history-entry` — New Lifecycle History Entry | poll | `lifecycle-history-list` | Each lifecycle-table entry added for the chosen employee |
| `new-attendance-entry` — New Attendance Entry | poll | `attendance-entries-search` | Each clock-in/out entry in the last `lookbackDays` (max 33) for the chosen employee |

`new-task` snapshots Bob's open-task response every five minutes and emits added tasks after its baseline poll; the 5,000-row bound is this trigger's own snapshot cap (not a figure Bob documents), and a response above it fails the check with a cap error. The other triggers diff the same way (shared `lib/triggers.ts` over the `pollSnapshot` kit): `POST /people/search` returns every matching employee in one response (https://apidocs.hibob.com/reference/post_people-search), the employee tables `GET /people/{id}/work|employment|lifecycle` return a `values` array whose entries each carry an `id` (https://apidocs.hibob.com/reference/get_people-id-work), and `POST /attendance/entries/search` is limited to a 33-day `clockInDate` window, follows `response_metadata.next_cursor`, and identifies an entry by `fields["/attendanceEntry/id"].value` (https://apidocs.hibob.com/reference/post_attendance-entries-search). None of these documents a created/updated cursor, so the first check records the collection and emits nothing; `new-or-updated-employee` also fires when a returned field changes. Per-employee triggers need the Bob employee id. `profiles-list` (same employees, public section) is covered by `new-employee`; `tasks-person-list` by `new-task`. Verified 2026-11-10.

Not covered: `fields-list`, `named-lists-list`, `onboarding-wizards-list`, `reports-list` and `timeoff-policy-types-list` are reference/admin definitions, not records.
