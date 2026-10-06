# Better Stack

Manage **Better Stack Uptime** from a workflow: monitors, heartbeats, incidents, on-call calendars,
escalation policies and status pages, over the Uptime API at `uptime.betterstack.com`.

- **Categories** — monitoring, developer-tools
- **Auth methods** — api-token (bearer)
- **Actions** — 30
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-token`
- **Egress allowlist** — `uptime.betterstack.com` (the `service` check adds `status.betterstack.com`
  to its own hook allowlist, never to the app's)
- **API docs** — https://betterstack.com/docs/uptime/api/getting-started-with-uptime-api/
- **Status page** — https://status.betterstack.com/

> Everything here was read on 2026-10-06 from Better Stack's own API reference (the `.md` variant of
> each page under `betterstack.com/docs/uptime/api/`) and probed live against
> `uptime.betterstack.com` and `status.betterstack.com`.

## Connecting

Create an **Uptime API token** (Better Stack > API tokens > Team-based tokens), or use a **global API
token**. A global token spans teams, so the create actions (`monitor-create`, `heartbeat-create`,
`incident-create`) take a `team_name` to say which team owns the new resource, and the list actions
take it as a filter. A team token needs neither.

The connection test calls `GET /api/v2/monitor-groups?per_page=1`: it requires a credential (a bogus
token answers 401 `{"errors":"Invalid Team API token..."}`, an unknown path answers 404) and returns
group names only. The verdict comes from the response body, not the status code.

## Things most likely to go wrong

1. **The documented host is not the host this app calls.** The reference examples and every
   `pagination.next` URL say `incidents.betterstack.com`. `uptime.betterstack.com` serves the same
   routes with the same bodies, so that is the only declared host, and list actions paginate by `page`
   number (`nextPage` in the result) instead of following the vendor's URL.
2. **Two API versions.** Incidents and escalation policies are `/api/v3`; everything else is `/api/v2`.
3. **Monitor reads can echo secrets the user typed in.** The reference says `proxy_host` "can include
   authentication credentials", its Playwright example is `{"PASSWORD": "passw0rd"}`, and a request
   header can carry `Authorization`. Actions that return monitors redact: the userinfo of
   `proxy_host`, every `environment_variables` value, request-header values whose name looks like
   `authorization|cookie|token|secret|password|api-key`, and `auth_password`. Keys and names stay.
   Escalation policies carry an `incident_token` the reference does not explain; it is dropped.
4. **A heartbeat's `url` is returned as is.** It is the ping URL the job must call, so it is the
   point of the read. Anyone holding it can record a beat for that heartbeat.
5. **Acknowledge, resolve and reopen answer 409 on a repeat** ("Incident was already acknowledged"),
   so they are marked non-idempotent and the vendor's message is surfaced as the error.
6. **Create Incident's documented 404 is "Authentication failed" with an empty body.** The error then
   carries only the status.
7. **JSON:API envelopes are flattened.** A monitor is `{id, type, ...attributes, relationships}`, so
   a workflow reads `monitor.status`. List actions return `{items, count, hasMore, nextPage}`; On-call
   calendars also return `included[]` (people, with e-mail and phone numbers).

## Actions

| Group          | Actions |
| -------------- | ------- |
| Monitors       | `monitor-list`, `monitor-get`, `monitor-create`, `monitor-update`, `monitor-delete`, `monitor-availability-get`, `monitor-response-times-get`, `monitor-group-list` |
| Heartbeats     | `heartbeat-list`, `heartbeat-get`, `heartbeat-create`, `heartbeat-update`, `heartbeat-delete`, `heartbeat-availability-get` |
| Incidents      | `incident-list`, `incident-get`, `incident-create`, `incident-acknowledge`, `incident-resolve`, `incident-reopen`, `incident-timeline-get`, `incident-comment-list` |
| On-call        | `on-call-list`, `on-call-events-list`, `escalation-policy-list`, `severity-list` |
| Status pages   | `status-page-list`, `status-page-get`, `status-report-list`, `status-page-resource-list` |

## Health

- **`service`** reads `https://status.betterstack.com/index.json`. That page is Better Stack's own
  hosted status page (`data.id` `133002`, `custom_domain` `status.betterstack.com`) and speaks Better
  Stack's JSON:API schema, not Atlassian's: there is no `status.indicator` or `components[]`, only
  `included[]` sections and resources. The page has three sections, "Better Stack", "Uptime" and
  "Telemetry". The first two cover this API; **Telemetry is a different product and is ignored**, and
  so is the page's `aggregate_state`, which rolls all three up. Resources with `not_monitored` are
  skipped. A page that no longer self-identifies as Better Stack's, or an unreadable one, reports
  `unknown`, never `down`.
- **`quota`** is a declared absence (`informational`): the reference documents no rate limit or
  usage quota for API calls. The only `429` in it belongs to `GET /api/v2/usage`, a billing endpoint
  on `betterstack.com`.
- **`auth:api-token`** is derived from the connection test.

## Not covered

Left out because they could not be confirmed against a documented, same-host endpoint, or because
they are a different product:

- **The Telemetry API** (logs, metrics, sources) was not verified and is not part of this app.
- **Usage, team members and roles** (`/api/v2/usage`, `/api/v2/team-members`, `/api/v2/roles`) are
  documented on `betterstack.com`, need a global token, and answer 404 on `uptime.betterstack.com` (all three measured)
 .
- Deleting or escalating an incident, status-page create/update/delete, status reports and updates,
  subscribers, sections, monitor/heartbeat/policy groups beyond the monitor-group list, metadata
  records, New Relic integrations and the incident log drain.
- Monitor fields `auth_username`, `auth_password`, `proxy_host`, `proxy_port`, `playwright_script`,
  `scenario_name`, `environment_variables`, `remember_cookies` and `metadata` on create/update: they
  carry credentials or scripts and are better set in Better Stack until there is a safe way to supply
  them.
- Nested `metadata[...]` filters on incident list.

## Layout

```
betterstack/
├── package.json        # identity, one egress host
├── index.ts            # { actions, auth, healthChecks }
├── auth/api-token.ts   # bearer sign + body-classified connection test
├── actions/            # one file per action
├── health/             # service (status page), quota (declared absence)
├── lib/client.ts       # call, JSON:API flatten, pagination, scrubbing
├── lib/params.ts       # shared params and request-body builders
├── assets/icon.svg     # Simple Icons "Better Stack" mark, verbatim
├── assets/icon.dark.svg# same paths, fill #ffffff, for the dark tile
└── tests/
```

`assets/icon.svg` is the verbatim Simple Icons mark
(`cdn.jsdelivr.net/npm/simple-icons/icons/betterstack.svg`); the dark variant only adds
`fill="#ffffff"` to the root element.
