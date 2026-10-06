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
