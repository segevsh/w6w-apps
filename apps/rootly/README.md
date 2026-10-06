# Rootly

Incident management from a workflow: declare, update, mitigate and resolve incidents, keep their
timelines and action items, raise and resolve alerts, browse and edit the service and team catalog,
and ask who is on call. Vendor docs: <https://docs.rootly.com/api-reference>.

## Connecting

Create an API token in Rootly under **Organization Settings > API Keys** (Global, Team or Personal;
make one per connection so it can be revoked on its own) and paste it. The token is sent as
`Authorization: Bearer <token>` to `api.rootly.com`, the only host this app calls. A token can only
do what its role allows, so a Team or Personal token legitimately gets 403 on resources outside its
reach; the connection test still passes for those, because the token itself authenticated.

## Actions

| Action | Route | Notes |
| --- | --- | --- |
| List Incidents | `GET /v1/incidents` | filters, sort, include, page number or cursor |
| Get Incident | `GET /v1/incidents/{id}` | |
| Create Incident | `POST /v1/incidents` | invocation id sent as `Idempotency-Key` |
| Update Incident | `PUT /v1/incidents/{id}` | |
| Resolve Incident | `PUT /v1/incidents/{id}/resolve` | optional resolution message |
| Mitigate Incident | `PUT /v1/incidents/{id}/mitigate` | optional mitigation message |
| List Incident Events | `GET /v1/incidents/{incident_id}/events` | the timeline |
| Create Incident Event | `POST /v1/incidents/{incident_id}/events` | a timeline note |
| List Incident Action Items | `GET /v1/incidents/{incident_id}/action_items` | |
| Create Incident Action Item | `POST /v1/incidents/{incident_id}/action_items` | |
| List Alerts | `GET /v1/alerts` | |
| Get Alert | `GET /v1/alerts/{id}` | |
| Create Alert | `POST /v1/alerts` | can notify a user, team, escalation policy, service or functionality |
| Update Alert | `PATCH /v1/alerts/{id}` | |
| Resolve Alert | `POST /v1/alerts/{id}/resolve` | optionally resolves related incidents |
| List Services | `GET /v1/services` | |
| Get Service | `GET /v1/services/{id}` | |
| Create Service | `POST /v1/services` | |
| Update Service | `PUT /v1/services/{id}` | |
| List Teams | `GET /v1/teams` | |
| Get Team | `GET /v1/teams/{id}` | |
| Create Team | `POST /v1/teams` | JSON:API type `groups` |
| Update Team | `PUT /v1/teams/{id}` | |
| List Severities | `GET /v1/severities` | |
| List Environments | `GET /v1/environments` | |
| List Functionalities | `GET /v1/functionalities` | |
| List Users | `GET /v1/users` | |
| Get User | `GET /v1/users/{id}` | |
| Get Current User | `GET /v1/users/me` | the token's owner |
| List Schedules | `GET /v1/schedules` | |
| List Shifts | `GET /v1/shifts` | time range, users, schedules |
| List On-Calls | `GET /v1/oncalls` | who is on call now or over a range |

### Shapes

Rootly speaks JSON:API (`application/vnd.api+json`, bodies wrapped as `data.attributes`). This app
hides the envelope: params are plain fields, and every record comes back **flattened** to its
attributes plus `id` and `type`. List actions return `{ items, included, meta, links }`; the rest
return `{ item, included }`. Related records requested with **Include** arrive in `included`.
Update actions send only the attributes you set, so a field cannot be cleared to empty from here.

## Not yet covered

Deleting incidents, services, teams and other records; escalation policies and their levels and
paths; schedule rotations, overrides, shadows and coverage requests; alert sources, urgencies,
fields, groups and routing rules; incident roles, types, causes, statuses, sub-statuses, custom
fields and forms; retrospectives, post-mortems and meeting recordings; status pages and
announcements; workflows and their runs; catalog entities and properties; user contact methods and
notification rules; webhooks; bulk upsert/delete endpoints and the AI chat endpoints.

## Health

| Check | What it does |
| --- | --- |
| `service` | Declared unavailable (informational). `status.rootly.com` is behind a Cloudflare managed challenge that answers every path with an HTML 403 to a non-browser client, so no status can be read. |
| `api` | Unsigned `GET /v1/users/me`. Rootly's JSON `{"errors":[...]}` 401 counts as a pass (the application is answering); a 5xx is `down`; an HTML page is `unknown`. |
| `quota` | Signed `GET /v1/users/me`, reading `x-ratelimit-limit` / `-remaining` / `-reset` (3,000 requests per 60 seconds). Informational. |
| `auth:api-token` | Derived from the auth `test` hook: the same `GET /v1/users/me`, rejected on a 401 `Invalid token`. |

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

The icon in `assets/icon.svg` is Rootly's favicon (`docs.rootly.com/favicon.svg`), stored verbatim.
