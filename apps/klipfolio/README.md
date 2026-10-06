# Klipfolio

Manage Klipfolio data sources, Klips, dashboards, users, clients and groups, and queue data source refreshes.

- **App id:** `io.w6w.klipfolio` · **Category:** analytics
- **API:** `https://app.klipfolio.com/api/1.0/` (reference: https://apidocs.klipfolio.com/). The reference is hand-written readme.io pages, not an OpenAPI document; every path here was read from it.
- **Auth:** `api-key` — the key goes in the `kf-api-key` header (My Profile → API key, or Users for an admin with `user.manage`). Requests act as the key's owner with that user's role permissions.
- **Icon:** `assets/icon.png`, the 512×512 PNG from https://www.klipfolio.com/favicon.png, verbatim.

## Actions (42)

| Area | Actions |
|---|---|
| Data sources | `datasource-list`, `-get`, `-create`, `-update`, `-delete`, `-enable`, `-disable`, `-refresh-many` |
| Data source instances | `datasource-instance-list`, `-get`, `-refresh`, `-data-get` |
| Klips | `klip-list`, `-get`, `-create`, `-update`, `-delete`, `klip-client-instance-list` |
| Dashboards (API path `/tabs`) | `dashboard-list`, `-get`, `-create`, `-update`, `-delete` |
| Users | `user-list`, `-get`, `-create`, `-update`, `-delete` |
| Clients | `client-list`, `-get`, `-create`, `-update`, `-delete` |
| Groups | `group-list`, `-get`, `-create`, `-update`, `-delete`, `group-user-list`, `-add`, `-remove` |
| Profile | `profile-get` |

Lists take `limit` (1–100, default 25; over 100 is a 400) and `offset`, and return `{ items, count, total }`. Creates return `{ id, location }`. Updates, deletes and operations return `{ success, op }`. Every call accepts the optional `client_id` to act on a client account (partner accounts).

## Health checks

- `auth:api-key` (derived) — `GET /profile`, the caller's own user record; the body never contains the key. The verdict is read from `meta.error_code` (`auth_fail` rejected, `auth_not_provided` missing); both are HTTP 401.
- `api` — unsigned `GET /profile`; the documented 401 envelope means the API is up.
- `service` — **declared absence**, `informational`. No Klipfolio status page was found: `klipfolio.statuspage.io` redirects to Atlassian's Statuspage marketing site and no `status.*` host resolves.
- `quota` — **declared absence**, `informational`. 5 requests/second plus a plan-dependent daily allowance (429 on excess); no rate-limit header or usage endpoint is documented.

## Left out

- **Data-instance data upload** (`PUT /datasource-instances/{id}/data`): the reference shows only `-d "<filename>"` with no content type or body shape.
- Share-rights, properties, roles/permissions, tab layout, tab klip instances, Klip schema, annotations, published links, `@/import`, `@/delete_instances`, client `@/extend_trial` and `@/enable_direct_billing`: outside the core scope; trimmed rather than guessed.
- `client_id` on `datasources/@/refresh`, `@/enable`, `@/disable`: the reference does not say where it goes, so it is not sent.
- No page of the reference carried a deprecation banner at the time of writing (2026-10-06).

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
