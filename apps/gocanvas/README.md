# GoCanvas

Mobile forms and field-data collection over the GoCanvas REST API v3
(`https://www.gocanvas.com/api/v3`, reference at `api.gocanvas.com/api/v3/docs`).

Only the US host `www.gocanvas.com` is covered. The EU and AU regional hosts are not documented by
the vendor, so they are not in `network.allow`.

- **Triggers** — 17 (6 webhook, 11 poll)

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `submission-created` — New Submission | webhook (API-registered, unsigned) | `submission_create` | event type, form id, delivery payload |
| `submission-edited` — Submission Edited | webhook (API-registered, unsigned) | `submission_edit` | event type, form id, delivery payload |
| `dispatch-created` — New Dispatch | webhook (API-registered, unsigned) | `dispatch_create` | event type, form id, delivery payload |
| `workflow-handoff-created` — Workflow Handoff | webhook (API-registered, unsigned) | `workflow_handoff_create` | event type, form id, delivery payload |
| `submission-status-changed` — Submission Status Changed | webhook (API-registered, unsigned) | `submission_custom_status_change` | event type, form id, delivery payload |
| `any-event` — Any Event | webhook (API-registered, unsigned) | the events named in `events`, or all five | event type, form id, delivery payload |
| `new-form` — New Form | poll (snapshot) | `GET /forms` | the new form (a new version of a known form is not new) |
| `new-user` — New User | poll (snapshot) | `GET /users` | the new user |
| `new-customer` — New Customer | poll (snapshot) | `GET /customers` | the new customer |
| `new-site` — New Site | poll (snapshot) | `GET /sites` | the new site |
| `new-project` — New Project | poll (snapshot) | `GET /projects` | the new project |
| `new-group` — New Group | poll (snapshot) | `GET /groups` | the new group |
| `new-department` — New Department | poll (snapshot) | `GET /departments` | the new department |
| `new-department-user` — New Department Member | poll (snapshot) | `GET /departments/{id}/users` | the new member and role |
| `new-form-assigned-user` — User Assigned to Form | poll (snapshot) | `GET /forms/{id}/assigned_users` | the newly assigned user |
| `new-submission` — New Submission | poll (since-filter on `created_at`) | `GET /submissions?form_id=…&start_date=…` | the new submission |
| `new-dispatch` — New Dispatch | poll (since-filter on `created_at`) | `GET /dispatches?form_id=…&start_date=…` | the new dispatch |

**Setup.** Set the trigger's `formId` (or leave it empty for a company-wide webhook, which needs an account administrator). Subscribing registers the trigger's URL with `POST /forms/{id}/webhooks` (or `POST /webhooks` company-wide) as `{ "event_type", "format": "json", "push_url", "push_tag": "w6w" }`; unsubscribing deletes the webhook (a webhook GoCanvas no longer has counts as deleted). A form holds only one webhook per event type, so a second subscription to the same form and event is refused by GoCanvas. `dispatch_create`, `workflow_handoff_create` and `submission_custom_status_change` only fire for forms with Dispatch, Workflow or Submission Statuses enabled. GoCanvas's API reference lists the event types but does not document the delivery body, so the run gets the payload exactly as GoCanvas sent it.

**Any Event.** GoCanvas takes one `event_type` per webhook and has no "all events" value, so `any-event` registers one webhook per event in its `events` param (comma-separated; empty means all five) and removes them all on unsubscribe. Each webhook's URL carries `?event=<type>`, so a delivery names its event even though GoCanvas does not document the delivery body, and a delivery for an event the subscription did not ask for is dropped. With `events` empty, an event GoCanvas refuses with a 400 or 422 because the form lacks Dispatch, Workflow or Submission Statuses is skipped (and logged as a warning); any other refusal (401, 403, 404, 409, 429, 5xx) fails the subscription and removes the webhooks already made; naming such an event explicitly fails the subscription (and removes the webhooks already made). A form holds one webhook per event, so `any-event` and a named trigger cannot both watch the same event on the same form (the second subscription is refused).

**Polls.** Nine `new-*` triggers read a collection GoCanvas returns whole and unordered (no sort or created-since filter is documented for it) through the same list action the app ships and emit each record not seen at the previous check. `new-form`, `new-user`, `new-customer`, `new-site`, `new-project` and `new-group` follow the `total-pages` header page by page (pages of 100); `new-department`, `new-department-user` and `new-form-assigned-user` do NOT: the docs name no `page` parameter for those three, so each check makes one request and reads what GoCanvas returns in it (a department or form with more than 100 rows may be cut at the vendor's default page size, which the docs do not rule out). More than 50 pages (5000 rows) fails with an error naming the cap. The first check only records what exists. `new-form` identifies a form by its `root_version_id`, because republishing a form gives it a new `id` (the id of that exact version). `new-department-user` and `new-form-assigned-user` take the department or form id as a required `string` param; `new-group` takes an optional department id. A record that moves between pages while a check is reading can be missed by that check and then reported once it reappears.

**Submission and dispatch polls.** `new-submission` and `new-dispatch` take a required form id (`string` param). Every submission and dispatch carries `created_at`, and `start_date`/`end_date` filter on it, so each check asks for `start_date` = the previous check's time minus 5 minutes (de-duplicated by id) and reads at most 5 pages of 100; a longer window continues on the next check from the page it stopped at (bounded by `end_date` = when the window started) before the clock moves on. The first check reads nothing, emits nothing and records the time: a record created before it is never emitted later. `new-submission` has an optional `status` (empty = completed, the GoCanvas default; `all` and `in-progress` are the other choices). They complement the webhook triggers: registering a webhook needs a Company Admin or Designer, GoCanvas allows one webhook per form and event, and a delivery carries metadata only, while the poll needs only access to the form and returns the whole record. A submission edited later is not a new submission (the list cannot be filtered by `revised_at`); use `submission-edited` for that. A submission that was started earlier and is completed later is found by its `created_at`, so it is missed when that is older than the window; pick `all` if that matters.

**Trust model.** GoCanvas does not sign its webhooks: its API reference documents no signature, secret or signing header, so there is nothing to verify and none is invented. The callback URL is the secret: the host issues it per subscription as a long unguessable id, and anyone who learns it can post a forged delivery to it, so keep it private. The trigger only checks that the request is a POST with a JSON object body.

Docs (verified 2026-11-10): https://api.gocanvas.com/api/v3/docs (Webhooks and Company-wide Webhooks list five `event_type` values: `dispatch_create`, `submission_create`, `submission_edit`, `workflow_handoff_create`, `submission_custom_status_change`; Pagination; the list endpoints named above)

## Auth

One credential type, `basic`: the GoCanvas login (email) and password of an API user, sent as HTTP
Basic. Both are secret fields and are written only by `sign`; no action or URL ever carries them.

OAuth (client credentials / PKCE) is not implemented: it needs a customer-created OAuth app and a
token exchange, which Basic avoids.

The connection test calls `GET /me` and passes only when the body carries a numeric `id`. A missing
and a wrong credential return an identical 401 body, so the failure message says it cannot tell them
apart.

## Actions (50)

| Key | Type | What it does |
| --- | --- | --- |
| `customer-create` | perform | Create a customer |
| `customer-delete` | perform | Soft-delete a customer (hidden from the web views, data kept), or permanently delete it with Delete permanently |
| `customer-get` | read | Fetch one customer by id |
| `customer-list` | read | List the company's customers (Project Management View only) |
| `customer-update` | perform | Update a customer |
| `department-create` | perform | Create a department with a name and optional description |
| `department-list` | read | List the company's departments |
| `department-user-add` | perform | Add an existing user to a department with a role |
| `department-user-list` | read | List the users in a department |
| `dispatch-create` | perform |  |
| `dispatch-delete` | perform | Soft-delete a dispatch (removed from mobile task lists, data kept), or permanently delete it |
| `dispatch-get` | read | Fetch one dispatch with its pre-filled responses |
| `dispatch-list` | read | List dispatches |
| `form-assigned-user-list` | read | List the users a form is assigned to |
| `form-get` | read | Fetch a form definition |
| `form-list` | read | List the forms the user can access |
| `form-report-list` | read | List the report definitions attached to a form |
| `form-user-assign` | perform | Assign a user to a form so they can start submissions on it |
| `form-user-unassign` | perform | Remove a user's assignment to a form |
| `group-get` | read | Fetch a group with its members and assigned forms |
| `group-list` | read | List groups, optionally for one department |
| `me-get` | read | Profile of the authenticated user: id, name, login, company and default department |
| `project-create` | perform | Create a project |
| `project-delete` | perform | Soft-delete a project, or permanently delete it with Delete permanently |
| `project-get` | read | Fetch one project by id |
| `project-list` | read | List the projects of a department the user can access (Project Management View only) |
| `project-update` | perform | Update a project |
| `reference-data-get` | read | Fetch one reference data set with its rows |
| `reference-data-list` | read | List reference data sets (the spreadsheet-like lookups behind dropdowns) |
| `site-create` | perform | Create a site (a physical location where work is done) |
| `site-delete` | perform | Soft-delete a site, or permanently delete it with Delete permanently |
| `site-get` | read | Fetch one site by id |
| `site-list` | read | List the company's sites (Project Management View only) |
| `site-update` | perform | Update a site |
| `submission-create` | perform | Create a text-only submission against a form |
| `submission-delete` | perform | Soft-delete a submission (kept, hidden from the web views) or permanently delete it |
| `submission-get` | read |  |
| `submission-list` | read | List submissions |
| `submission-revision-list` | read | List the revision history of a submission, newest first |
| `submission-update` | perform | Change values on an existing submission (PATCH) |
| `user-create` | perform | Create a user |
| `user-get` | read | Fetch one user by id |
| `user-list` | read | List the company's users, optionally only enabled or only disabled ones |
| `user-update` | perform | Update a user's name, phone or enabled flag |
| `webhook-create` | perform | Subscribe a URL to a form event |
| `webhook-delete` | perform | Soft-delete a webhook, or permanently delete it |
| `webhook-get` | read | Fetch one webhook of a form |
| `webhook-list` | read | List the webhooks configured on a form |
| `webhook-test` | perform | Send a test payload to the webhook's URL and report the response code and body the endpoint gave back |
| `webhook-update` | perform | Change a webhook's event, format, URL or tag |
Deletes are soft by default; pass `hardDelete` to remove permanently. Lists return
`{ items, pagination }` because GoCanvas pages in response headers, not the body.

## Health checks

- `service` reads the vendor's Atom feed at `status.gocanvas.com/incidents.atom`. Incidents prefixed
  EU or AU are ignored (this app talks to the US host). An open US or global incident is `degraded`;
  a feed failure is `unknown`, never `down`.
- `quota` is declared `unavailable` at informational severity: RateLimit headers are documented only
  on a 429, so there is nothing to read ahead of time.

## Vendor gotchas

- Errors come in two shapes, `{"errors":[...]}` and `{"error":"..."}`.
- Lists are bare arrays; paging lives in response headers.
- Webhooks are nested under `/forms/{formId}/webhooks`.
- `submission-create` sends a `guid` duplicate guard; `submission-update` sends an `edit_guid` retry
  guard. A blank next-workflow-user unassigns.
- Scheduled-dispatch times use `MM/DD/YYYY HH:mm:ss AM`; everything else is ISO-8601.

## Not covered

List actions with no trigger of their own: `reference-data-list` (lookup tables behind dropdowns: reference data); `form-report-list` (the form's report definitions: report configuration); `webhook-list` (every webhook configured on the form, including company-wide ones: webhook administration); `submission-revision-list` (the revision history of one submission: a per-submission list the user does not pick). GoCanvas has webhook events only for submissions, dispatches, workflow handoffs and submission statuses, so customers, sites, projects, users and forms have no webhook.

Also not covered:

Workflows, submission values and binary/multipart media upload, reference images, reference-data
create/update, group writes, user password change, partnership, tracker locations, form
create/update/delete, report (PDF) download, token exchange and OAuth.

## Icon

`assets/icon.svg` is the vendor's own mark path, unmodified apart from the fill colour.
