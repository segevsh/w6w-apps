# Productive.io

Project, resource and financial management for agencies. 57 actions over the Productive REST API
(`https://api.productive.io/api/v2`, JSON:API). Every path, filter, attribute and enum was read
from the vendor's own OpenAPI document (`developer.productive.io`, `api-master.yaml`) on 2026-10-06.

## Authentication

One method, **API token** (`api-token`): a personal token (Settings > API integrations > Generate
new token) sent as `X-Auth-Token`, plus the numeric **organization id** sent as
`X-Organization-Id`. Both are stamped by `sign`; no action touches them. The token acts as its
owner, so use a dedicated person for automation. Productive documents no OAuth flow for third
parties, so none is offered.

The connection test is `GET /projects?page[size]=1`. `GET /organizations` is deliberately not
used: its documented attributes include `scim_bearer_token` and `invitation_token`. A missing and a
wrong token answer the same `401 invalid_auth_token`, so the verdict comes from the body, and a
403 is reported with the vendor's words (it can be a role without project access or a wrong
organization id).

## Actions

Lists take `filter` (a JSON object of any vendor filter, merged with the typed filters),
`sort`, `include` (side-loaded resources, flattened under `included`), and either `pageNumber` or
cursor paging (`cursorPaging`, then the returned `nextCursor` as `cursor`). Resources come back
flattened: attributes plus `id`, `type` and `relationships`.

| Key | Title | Type | Request |
| --- | --- | --- | --- |
| `project-list` | List Projects | search | `GET /projects` |
| `project-get` | Get Project | read | `GET /projects/{id}` |
| `project-create` | Create Project | perform | `POST /projects` |
| `project-update` | Update Project | perform | `PATCH /projects/{id}` |
| `project-archive` | Archive Project | perform | `PATCH /projects/{id}/archive` |
| `project-restore` | Restore Project | perform | `PATCH /projects/{id}/restore` |
| `task-list` | List Tasks | search | `GET /tasks` |
| `task-get` | Get Task | read | `GET /tasks/{id}` |
| `task-create` | Create Task | perform | `POST /tasks` |
| `task-update` | Update Task | perform | `PATCH /tasks/{id}` |
| `task-delete` | Delete Task | perform | `DELETE /tasks/{id}` |
| `tasklist-list` | List Task Lists | search | `GET /task_lists` |
| `tasklist-get` | Get Task List | read | `GET /task_lists/{id}` |
| `tasklist-create` | Create Task List | perform | `POST /task_lists` |
| `tasklist-update` | Update Task List | perform | `PATCH /task_lists/{id}` |
| `board-list` | List Boards | search | `GET /boards` |
| `board-get` | Get Board | read | `GET /boards/{id}` |
| `board-create` | Create Board | perform | `POST /boards` |
| `todo-list` | List To-dos | search | `GET /todos` |
| `todo-create` | Create To-do | perform | `POST /todos` |
| `todo-update` | Update To-do | perform | `PATCH /todos/{id}` |
| `comment-list` | List Comments | search | `GET /comments` |
| `comment-create` | Create Comment | perform | `POST /comments` |
| `comment-update` | Update Comment | perform | `PATCH /comments/{id}` |
| `comment-delete` | Delete Comment | perform | `DELETE /comments/{id}` |
| `person-list` | List People | search | `GET /people` |
| `person-get` | Get Person | read | `GET /people/{id}` |
| `company-list` | List Companies | search | `GET /companies` |
| `company-get` | Get Company | read | `GET /companies/{id}` |
| `company-create` | Create Company | perform | `POST /companies` |
| `company-update` | Update Company | perform | `PATCH /companies/{id}` |
| `deal-list` | List Deals and Budgets | search | `GET /deals` |
| `deal-get` | Get Deal or Budget | read | `GET /deals/{id}` |
| `deal-create` | Create Deal or Budget | perform | `POST /deals` |
| `deal-update` | Update Deal or Budget | perform | `PATCH /deals/{id}` |
| `deal-status-list` | List Deal Statuses | search | `GET /deal_statuses` |
| `time-entry-list` | List Time Entries | search | `GET /time_entries` |
| `time-entry-get` | Get Time Entry | read | `GET /time_entries/{id}` |
| `time-entry-create` | Create Time Entry | perform | `POST /time_entries` |
| `time-entry-update` | Update Time Entry | perform | `PATCH /time_entries/{id}` |
| `time-entry-delete` | Delete Time Entry | perform | `DELETE /time_entries/{id}` |
| `service-list` | List Services | search | `GET /services` |
| `service-get` | Get Service | read | `GET /services/{id}` |
| `booking-list` | List Bookings | search | `GET /bookings` |
| `booking-get` | Get Booking | read | `GET /bookings/{id}` |
| `booking-create` | Create Booking | perform | `POST /bookings` |
| `booking-update` | Update Booking | perform | `PATCH /bookings/{id}` |
| `booking-delete` | Delete Booking | perform | `DELETE /bookings/{id}` |
| `invoice-list` | List Invoices | search | `GET /invoices` |
| `invoice-get` | Get Invoice | read | `GET /invoices/{id}` |
| `workflow-status-list` | List Workflow Statuses | search | `GET /workflow_statuses` |
| `page-list` | List Docs Pages | search | `GET /pages` |
| `page-get` | Get Docs Page | read | `GET /pages/{id}` |
| `webhook-list` | List Webhooks | search | `GET /webhooks` |
| `webhook-get` | Get Webhook | read | `GET /webhooks/{id}` |
| `webhook-delete` | Delete Webhook | perform | `DELETE /webhooks/{id}` |
| `webhook-create` | Create Webhook | perform | `POST /webhooks` |

## Health checks

- `service` (service): the status page is Uptime.com-hosted and has no JSON feed of its own, but its
  page data (`status.productive.io/statuspage/productive/ajax`) lists components. The **API
  Requests** component decides; the others are detail. The page must self-identify as Productive's
  (`slug`, `cname`) and an unreadable page is `unknown`, never `down`.
- `api` (dependency): an unsigned `GET /projects`. A 401 carrying the JSON:API `errors` envelope
  passes (the API and its auth layer are answering); 5xx or non-JSON is `down`.
- `quota` (quota): declared unavailable, `informational`. Productive documents ceilings (100 requests
  per 10 s per token, 4,000 per 30 min per organization) but sends no remaining-count header and
  has no usage endpoint; a 429 carries `X-RateLimit-Reset`, which the client reports.
- `auth:*` is derived from the connection test.

## Not covered

Left out on purpose; none is a limitation of the app's design, only unbuilt:

- Reports (`/reports/*`), expenses, payments, pricing, revenue distributions, subscriptions,
  attachments, activities, custom fields and their options, project templates, workflows and
  workflow-status writes, teams, memberships and roles, time-off events, timers, approvals,
  integrations, entitlements and organizations (the last for the secret reason above).
- Invoice writes (create, finalise, send) and invoice line items.
- Deal and budget close, copy and invoice-generation routes.
- Webhook update, and webhook logs.
- Bulk and file-upload routes.

## Caveats

- **Nothing was run against a real organization.** No token was available. The wire format is the
  vendor spec's, and the unauthenticated behaviour (415 before auth, the 401 envelope, the status
  JSON) was measured live. Foreign keys are sent as attributes (`project_id`, `assignee_id`, ...),
  which is what the vendor's request schemas and its own Docs guide declare, rather than as JSON:API
  `relationships`. If a write is rejected for a missing relation, that is the first place to look.
- **Webhook event ids.** `eventId` is the vendor's raw number (1 to 35). The reference lists the
  numbers but not which event each means, so confirm one in Productive first.
- **Stored secrets are never returned.** The webhook actions drop `signature_token` and
  `custom_headers` from their answers.
- Several filters are numeric enums the reference does not label (task-list, board and to-do
  `status`, invoice `payment_status` and `sent_status`, deal `status_id`); the parameter hints say so.
- `Content-Type: application/vnd.api+json` is mandatory and is checked before authentication.
