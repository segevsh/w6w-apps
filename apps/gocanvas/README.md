# GoCanvas

Mobile forms and field-data collection over the GoCanvas REST API v3
(`https://www.gocanvas.com/api/v3`, reference at `api.gocanvas.com/api/v3/docs`).

Only the US host `www.gocanvas.com` is covered. The EU and AU regional hosts are not documented by
the vendor, so they are not in `network.allow`.

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

Workflows, submission values and binary/multipart media upload, reference images, reference-data
create/update, group writes, user password change, partnership, tracker locations, form
create/update/delete, report (PDF) download, token exchange and OAuth.

## Icon

`assets/icon.svg` is the vendor's own mark path, unmodified apart from the fill colour.
