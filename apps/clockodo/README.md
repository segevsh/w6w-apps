# Clockodo

Track time with **Clockodo**: time entries, the running clock, customers, projects, services,
users and absences, over the Clockodo REST API.

- **Categories** — productivity, hr
- **Auth methods** — `api-key` (a user's email + personal API key, sent as `X-ClockodoApiUser` /
  `X-ClockodoApiKey`, plus the mandatory `X-Clockodo-External-Application: w6w;<email>`)
- **Actions** — 29
- **Health checks** — `api` (unsigned reachability) + the derived `auth:api-key`; `service` and `quota` are declared unavailable (`severity: informational`)
- **Egress allowlist** — `my.clockodo.com`
- **API docs** — https://docs.clockodo.com (OpenAPI: `https://docs.clockodo.com/openapi.yaml`)
- **Icon** — the vendor's own mark, clockodo.com's `favicon.svg`, saved verbatim

Verified on 2026-10-06 against the published OpenAPI document and unsigned probes of
`my.clockodo.com/api`. No endpoint was called with a real key, so response shapes are the
documented ones, not sampled. Each resource is built on its newest documented, non-deprecated
version: v2 entries and clock, v3 customers and users, v4 projects, services and absences.

## Things most likely to go wrong

1. **The identification header is mandatory.** Every API-key request must carry
   `X-Clockodo-External-Application: <app or company>;<technical contact email>`. It is not a
   credential, but it needs the user's email, so the `sign` hook adds it (`w6w;<email>`). It is
   not required for OAuth bearer tokens; this app uses the API key only.
2. **Versions differ per resource.** Entries and the clock are `/v2`, customers and users `/v3`,
   projects, services and absences `/v4`, and the same noun can exist at several versions. They
   also return different envelopes: v2 entries wrap the record as `entry` / `entries`, v3 and v4
   use `data`, and absences list `{ data: [...] }` with no `paging` block.
3. **A missing and a wrong credential are the same 401**:
   `{"errors":[{"type":"General","message":"Authentication failed","details":null,"path":null}]}`.
   The credential test and the `api` check read that body, never the status alone. Errors are
   `errors[]` on the live API while the OpenAPI document also describes `{ "error": ... }`; the
   client reads both.
4. **Filters are `deepObject` queries** (`filter[users_id]=7`), not flat parameters, and
   `/v2/entries` requires both `time_since` and `time_until` (ISO 8601 UTC, e.g.
   `2026-10-01T00:00:00Z`).
5. **A time entry has three shapes** — time span, lump sum, lump-sum service — each with its own
   required fields (see Create Time Entry). A running clock entry has `time_until: null` and
   `duration: null`; stop it with Stop Clock, not Update Time Entry.
6. **Changing the Clockodo password invalidates the API key.** Rotate the connection afterwards.
7. **Everything runs with the key owner's access rights.** Fields such as `note`, revenue and
   hourly rates are silently absent without the matching rights, and setting `usersId` to another
   user needs administrator rights.

## Actions

| Area      | Actions                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| Entries   | `list-entries`, `get-entry`, `create-entry`, `update-entry`, `delete-entry`               |
| Clock     | `get-clock`, `start-clock`, `stop-clock`                                                  |
| Customers | `list-customers`, `get-customer`, `create-customer`, `update-customer`, `delete-customer` |
| Projects  | `list-projects`, `get-project`, `create-project`, `update-project`, `complete-project`    |
| Services  | `list-services`, `get-service`, `create-service`                                          |
| Users     | `list-users`, `get-user`, `get-current-user`                                              |
| Absences  | `list-absences`, `get-absence`, `create-absence`, `update-absence`, `delete-absence`      |

`budget` and `serviceAssignments` on projects are JSON params that use the API's own snake_case
names.

## Not covered

Trimmed to keep the app focused; all are documented in the reference and can be added the same way:

- Update/delete Service and delete Project; subprojects (`/v3/subprojects`); teams (`/v3/teams`).
- Creating and editing users (`POST`/`PUT /v3/users`).
- Work times and change requests (`/v2/workTimes`), planned hours (`/targethours`), user reports
  (`/userreports`), project reports (`/v4/projects/reports`).
- Holidays quota/carry, overtime carry/reduction, non-business days and groups, access groups,
  favorites, lump-sum services, rates, entry texts, entry groups, subscription.
- OAuth 2.0 (authorization code + mandatory PKCE, dynamic client registration). The API key is the
  only auth method here.
- List `sort` parameters (the array serialisation is not stated in the reference).

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /v4/users/me` (the caller's own
  record, which does not contain the key). Passes only on a `data` object; a 401/403 is reported
  with the vendor's own error message.
- **api** — unsigned `GET /v4/users/me`; the documented `Authentication failed` envelope is a pass
  (reachability, not credential validity), 5xx or no connection is down, 429 or anything else is
  degraded.
- **`service` declared unavailable** — Clockodo publishes no status page. No `status.clockodo.*` host answers,
  and the `clockodo.statuspage.io` subdomain redirects to Atlassian's marketing page, so none was
  invented.
- **`quota` declared unavailable** — the reference documents no usage or credit endpoint (429 is described only
  as "too many requests").
