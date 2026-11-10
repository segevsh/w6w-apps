# Everhour

Time tracking. This app drives Everhour's REST API: projects, sections, tasks and estimates,
custom fields, time records, timers, timecards, timesheets and approvals, clients and budgets,
expenses, invoices, the resource-planner schedule, time off, reports, users and webhooks.

- **Triggers** — 10 (poll)
- App id: `io.w6w.everhour` · categories: `productivity`, `project-management`, `finance`
- Host: `api.everhour.com` (the only entry in `network.allow`) · no path prefix
- Source of truth: Everhour's API Blueprint, `https://developers.everhour.com/` (the original API Blueprint at jsapi.apiary.io no longer resolves)
  (73 KB, fetched 2026-10-06), plus unauthenticated live probes of `api.everhour.com` the same
  day. The blueprint calls the API **BETA**.
- Icon: `https://everhour.com/assets/images/favicon.svg`, saved verbatim (2,189 bytes).

## Auth

One method, `api-key` (type `apiKey`): `X-Api-Key: <key>`. The key is on the user's profile page
(Everhour > My Profile, bottom of the page) and acts as that user, so a workflow can do what that
user's role allows. No OAuth and no query-string form is documented, so none is offered.

`sign` is the only code that sees the key. Every request also carries `X-Accept-Version: 1.2`
(the documented current version, pinned so a vendor bump cannot change responses silently).

### The probe is `GET /users/me`

The whoami returns the documented `User` schema (`id`, `name`, `headline`, `avatarUrl`, `role`,
`status`), which has no credential field. `test` keeps a boolean, `afterConnect` keeps only `name`
and `id`; the body is never stored. Measured 2026-10-06:

| Request | Status | Body |
|---|---|---|
| no `X-Api-Key` | 403 | `{"code":403,"message":"Access denied"}` |
| `X-Api-Key: invalid-key` | 403 | `{"code":403,"message":"Access denied"}` (byte-identical) |

Because a missing and a wrong key are indistinguishable, the verdict is **not** taken from the
status: a pass is a 2xx whose body is a user object (numeric `id`). A 200 with any other body
(HTML shell, unrelated JSON) fails; a 429 is reported as "not judged". A 200 with a real key was
**not observed** (no key was available); that success path is from the blueprint's `User` schema.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service | Declared absence (`severity: informational`) |
| `api` | dependency | Unsigned `GET /users/me`; a `{code, message}` 403 body passes |
| `quota` | quota | Declared absence (`severity: informational`) |
| `auth:api-key` | derived | From the auth `test` hook |

**Status page.** `status.everhour.com` is real (a Hund.io page titled "Status Page - Everhour",
components `API`, `Sync`, `Browser Extension`) but offers nothing machine-readable. Index-path
rule, tried 2026-10-06: `/summary.json`, `/status.json`, `/index.json`, `/api/v2/summary.json`,
`/api/v2/status.json` are 404; `/history.rss`, `/history.atom`, `/history.json` answer
`406 Not Acceptable` for every `Accept` value tried; `/api/v1/components.json` is
`401 not_authenticated`; `everhour.statuspage.io` redirects to `/inactive`. So `service` is a
declared absence rather than a guessed feed.

**Quota.** Everhour documents "around 20 requests per 10 seconds per API key", not guaranteed,
with `429` and `Retry-After` when exceeded; no rate-limit headers, no usage endpoint. Declared
absence. Action errors on a 429 include the `Retry-After` seconds.

## Actions (97)

All lists return `{ items, count, nextPage }` (the API answers a bare array; `nextPage` is set
when a `limit` was sent and the page came back full). Deletes return `{ ok: true }`. Everything
else returns the vendor object. Times are seconds, money is cents, project and task ids are
strings like `ev:123` / `as:456` (the colon stays literal in a path).

| Key | Type | Endpoint |
|---|---|---|
| `allocation-create` | perform | `POST /allocations` |
| `allocation-delete` | perform | `DELETE /allocations/{allocationId}` |
| `allocation-list` | search | `GET /allocations` |
| `allocation-update` | perform | `PUT /allocations/{allocationId}` |
| `assignment-create` | perform | `POST /resource-planner/assignments` |
| `assignment-delete` | perform | `DELETE /resource-planner/assignments/{assignmentId}` |
| `assignment-list` | search | `GET /resource-planner/assignments` |
| `assignment-update` | perform | `PUT /resource-planner/assignments/{assignmentId}` |
| `attachment-create` | perform | `POST /attachments` |
| `attachment-delete` | perform | `DELETE /attachments/{attachmentId}` |
| `client-budget-delete` | perform | `DELETE /clients/{clientId}/budget` |
| `client-budget-set` | perform | `PUT /clients/{clientId}/budget` |
| `client-create` | perform | `POST /clients` |
| `client-get` | read | `GET /clients/{clientId}` |
| `client-list` | search | `GET /clients` |
| `client-report` | search | `GET /dashboards/clients` |
| `client-update` | perform | `PUT /clients/{clientId}` |
| `expense-attachment-add` | perform | `POST /expenses/{expenseId}/attachments` |
| `expense-category-create` | perform | `POST /expenses/categories` |
| `expense-category-delete` | perform | `DELETE /expenses/categories/{categoryId}` |
| `expense-category-list` | search | `GET /expenses/categories` |
| `expense-category-update` | perform | `PUT /expenses/categories/{categoryId}` |
| `expense-create` | perform | `POST /expenses` |
| `expense-delete` | perform | `DELETE /expenses/{expenseId}` |
| `expense-list` | search | `GET /expenses` |
| `expense-update` | perform | `PUT /expenses/{expenseId}` |
| `field-create` | perform | `POST /projects/{projectId}/fields` |
| `field-delete` | perform | `DELETE /fields/{fieldId}` |
| `field-list` | search | `GET /projects/{projectId}/fields` |
| `field-reorder` | perform | `PUT /projects/{projectId}/fields-order` |
| `field-update` | perform | `PUT /fields/{fieldId}` |
| `invoice-create` | perform | `POST /clients/{clientId}/invoices` |
| `invoice-delete` | perform | `DELETE /invoices/{invoiceId}` |
| `invoice-export` | perform | `POST /invoices/{invoiceId}/export` |
| `invoice-get` | read | `GET /invoices/{invoiceId}` |
| `invoice-list` | search | `GET /invoices` |
| `invoice-refresh` | perform | `POST /invoices/{invoiceId}/reset-time` |
| `invoice-status-set` | perform | `POST /invoices/{invoiceId}/{status}` |
| `invoice-update` | perform | `PUT /invoices/{invoiceId}` |
| `project-archive` | perform | `PATCH /projects/{projectId}/archive` |
| `project-billing-set` | perform | `PUT /projects/{projectId}/billing` |
| `project-create` | perform | `POST /projects` |
| `project-delete` | perform | `DELETE /projects/{projectId}` |
| `project-get` | read | `GET /projects/{projectId}` |
| `project-list` | search | `GET /projects` |
| `project-report` | search | `GET /dashboards/projects` |
| `project-sync` | perform | `POST /projects/{projectId}/sync` |
| `project-task-search` | search | `GET /projects/{projectId}/tasks/search` |
| `project-time-list` | search | `GET /projects/{projectId}/time` |
| `project-update` | perform | `PUT /projects/{projectId}` |
| `section-create` | perform | `POST /projects/{projectId}/sections` |
| `section-delete` | perform | `DELETE /sections/{sectionId}` |
| `section-get` | read | `GET /sections/{sectionId}` |
| `section-list` | search | `GET /projects/{projectId}/sections` |
| `section-update` | perform | `PUT /sections/{sectionId}` |
| `task-create` | perform | `POST /projects/{projectId}/tasks` |
| `task-delete` | perform | `DELETE /tasks/{taskId}` |
| `task-estimate-delete` | perform | `DELETE /tasks/{taskId}/estimate` |
| `task-estimate-set` | perform | `PUT /tasks/{taskId}/estimate` |
| `task-get` | read | `GET /tasks/{taskId}` |
| `task-list` | search | `GET /projects/{projectId}/tasks` |
| `task-search` | search | `GET /tasks/search` |
| `task-time-list` | search | `GET /tasks/{taskId}/time` |
| `task-update` | perform | `PUT /tasks/{taskId}` |
| `time-add` | perform | `POST /time` |
| `time-delete` | perform | `DELETE /time/{timeId}` |
| `time-list` | search | `GET /team/time` |
| `time-off-create` | perform | `POST /resource-planner/assignments` |
| `time-off-type-create` | perform | `POST /resource-planner/time-off-types` |
| `time-off-type-delete` | perform | `DELETE /resource-planner/time-off-types/{typeId}` |
| `time-off-type-list` | search | `GET /resource-planner/time-off-types` |
| `time-off-type-update` | perform | `PUT /resource-planner/time-off-types/{typeId}` |
| `time-update` | perform | `PUT /time/{timeId}` |
| `timecard-clock-in` | perform | `POST /users/{userId}/timecards/clock-in` |
| `timecard-clock-out` | perform | `POST /users/{userId}/timecards/clock-out` |
| `timecard-delete` | perform | `DELETE /users/{userId}/timecards/{date}` |
| `timecard-get` | read | `GET /users/{userId}/timecards/{date}` |
| `timecard-list` | search | `GET /timecards` |
| `timecard-update` | perform | `PUT /users/{userId}/timecards/{date}` |
| `timer-current` | read | `GET /timers/current` |
| `timer-start` | perform | `POST /timers` |
| `timer-stop` | perform | `DELETE /timers/current` |
| `timer-team-list` | search | `GET /team/timers` |
| `timesheet-approval-discard` | perform | `PUT /timesheets/{timesheetId}/discard-approval` |
| `timesheet-approval-request` | perform | `POST /timesheets/{timesheetId}/approval` |
| `timesheet-approval-review` | perform | `PUT /timesheets/{timesheetId}/approval` |
| `timesheet-list` | search | `GET /timesheets` |
| `user-list` | search | `GET /team/users` |
| `user-me` | read | `GET /users/me` |
| `user-report` | search | `GET /dashboards/users` |
| `user-time-list` | search | `GET /users/{userId}/time` |
| `user-timecard-list` | search | `GET /users/{userId}/timecards` |
| `user-timesheet-list` | search | `GET /users/{userId}/timesheets` |
| `webhook-create` | perform | `POST /hooks` |
| `webhook-delete` | perform | `DELETE /hooks/{hookId}` |
| `webhook-get` | read | `GET /hooks/{hookId}` |
| `webhook-update` | perform | `PUT /hooks/{hookId}` |

## Deliberately left out

- **Estimates Report** (`GET /team/estimate/export`) and **Time Report**
  (`GET /team/time/export`): both marked *deprecated* in the blueprint. Use the dashboard reports
  and the time-record lists.
- **Download Attachment** (`GET /attachments/{token}/download`): answers raw `image/png`/`pdf`
  bytes; a step output is JSON, so nothing honest can be returned.
- **Update Task Custom Fields** (`PUT /tasks/{id}`): the blueprint points at the `TaskRequest`
  schema, which has no custom-field member, so the body shape is undocumented. Not guessed.
- **List Webhooks**: the blueprint documents get, create, update and delete only.

## Notes on the vendor surface

- **Time off shares a URL with assignments.** Create Time Off is
  `POST /resource-planner/assignments` with `type: "time-off"`; Create Assignment is the same URL
  with `type: "project"`.
- **Time-off types and allocations are documented as `201` on `GET`/`PUT`.** Any 2xx is accepted.
- **Billing is opt-in.** Add `opts_include_billing=1` (the *Include billing* param on Get Task and
  List Team Time Records); the vendor silently omits `billing` for non-admins.
- **Report date filters** are documented as `date.gte` / `date.lte`; the actions expose them as
  *From date* / *To date* and send exactly those names. The blueprint lists them under parameters
  but not in the URI template, and no live call confirmed them.
- **Webhook verification.** On create or update Everhour POSTs the target an empty body with an
  `X-Hook-Secret` header, which the target must echo back before the hook is active.
- **Task create requires a section** (`TaskRequest.section` is `required` in the blueprint), even
  though the update call is otherwise a partial-looking payload; the update action follows the
  same schema.
- Paged list defaults are prefilled small (`limit` 100) where the vendor's own default is
  undocumented; time lists allow up to 50,000, tasks 250.

## Tests

`deno task test` — every action has its own file under `tests/actions/` asserting verb, path,
query, JSON body, the version header, absence of a credential header, the output shape and an
error path; plus `tests/index.test.ts`, `tests/lib/`, `tests/auth/` and `tests/health/`.

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-client` — New Client | Poll | `client-list` | Each client newly added to the account |
| `new-invoice` — New Invoice | Poll | `invoice-list` | Each invoice newly created in the account |
| `new-project` — New Project | Poll | `project-list` | Each project newly visible to the key's owner |
| `new-task` — New Task | Poll | `task-list` | Each task newly added to a selected project |
| `new-section` — New Section | Poll | `section-list` | Each section newly added to a selected project |
| `new-expense` — New Expense | Poll | `expense-list` | Each expense newly logged by the key's owner |
| `new-user` — New Team Member | Poll | `user-list` | Each user newly added to the team |
| `new-assignment` — New Schedule Assignment | Poll | `assignment-list` | Each resource-planner assignment or time-off entry newly scheduled |
| `new-time-record` — New Time Record | Poll | `time-list` | Each team time record newly dated within the look-back window |
| `new-timecard` — New Timecard | Poll | `timecard-list` | Each timecard newly started (a user's first clock-in of a day) |

Everhour's lists are bare arrays with no documented order and no created/updated-since filter
([pagination](https://developers.everhour.com/pagination.md)), so each trigger reads its whole
collection and diffs it against the previous check, emitting only additions, never edits or
removals. The first check only records what exists. Collections are read in full, paged where
the endpoint pages (projects 100 per page, tasks 250 per page), and a collection that outgrows
the per-check limit (10 pages of projects, 8 of tasks, 5000 rows overall) makes the check fail
with an error naming the limit instead of reading part of it. Time records and timecards are
filtered by their work date, not by when they were created, so those two read a window of the
last N days (setting "Look back (days)", default 3, 1-31): a record backdated beyond the window
is not seen. Search and per-user, per-task and per-project time lists return the same records as
the triggers above; reference data (expense categories, time-off types, custom-field definitions,
time-off allocations), reports (timesheets) and the live team-timer view are not event feeds and
have no trigger. Everhour also delivers outbound webhooks (`POST /hooks`; the `X-Hook-Secret`
header is sent once at the registration handshake and is not repeated on event deliveries, so
deliveries carry no signature) — queued separately
([webhooks](https://developers.everhour.com/webhooks.md)). Verified 2026-11-10
([projects](https://developers.everhour.com/api-reference/projects/get-all-projects.md),
[tasks](https://developers.everhour.com/api-reference/tasks/get-project-tasks.md),
[time records](https://developers.everhour.com/api-reference/time-records/get-all-time-records.md),
[timecards](https://developers.everhour.com/api-reference/timecards/get-all-timecards.md)).
