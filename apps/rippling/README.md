# Rippling

Read and manage the HR core of a Rippling company (workers, users, org structure, leave, custom
objects) on the **Rippling REST API v2**.

- **Categories** — hr, productivity
- **Auth methods** — api-token (Bearer)
- **Actions** — 44
- **Health checks** — 2 (`service`, ~~`quota`~~ declared unavailable, `informational`) + the derived
  `auth:api-token`
- **Egress allowlist** — `rest.ripplingapis.com` (the `service` check adds `status.rippling.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.rippling.com/
- **API docs** — https://developer.rippling.com/
- **Status page** — https://status.rippling.com/

> The operation list was recovered from Rippling's own API reference (the per-operation OpenAPI is
> embedded as base64 + zlib JSON in the docs page chunks; no OpenAPI file is published) and the
> auth behaviour was probed live against `rest.ripplingapis.com`. Anything that could not be
> confirmed that way is left out, listed below.

## Auth

An **API token** sent as `Authorization: Bearer <token>`. Create it in Rippling's developer
settings and grant the read/write scopes for the areas you use (e.g. `companies.read`,
`workers.read`, `users.read`, `departments.write`). A scope the token lacks answers 403 naming the
scope; the connection test treats such a 403 as "token accepted" because it proves authentication.

The test calls `GET /companies/?limit=1`, which does not echo the credential. A missing token and a
fabricated one return the identical 401 `{"ok":false,"error":"Incorrect authentication
credentials."}`; tokens unused for 30 days may be revoked.

**OAuth is not offered**: the docs did not give a full generic authorize/token URL pair for it.

## Actions

- **Read (lists and get-by-id)** — worker, user, department, team, work-location, employment-type,
  legal-entity, leave-request, leave-balance, leave-type, level, title, compensation; plus
  `company-list`, `custom-field-list`, `custom-object-field-list`, `custom-object-record-list`,
  `custom-object-record-query`, `custom-object-record-get`.
- **Write** — `department-create/update`, `team-create/update`,
  `work-location-create/update/delete`, `leave-request-create/update`,
  `custom-object-record-create/update/delete`.

Lists return `{results, nextCursor, nextLink, redactedFields}`; pass `nextCursor` (or a pasted
`next_link`, which is reduced to its cursor and never fetched) back as `cursor`. `limit` defaults
to 50 and caps at 100. Burst limit is 300 requests per 10 seconds.

## Findings

1. Custom-object create/update wrap the record as `{data}`; get-by-external-id is bare; the query
   endpoint returns a bare `cursor`, not `next_link`.
2. Updates are `PATCH`; deletes answer 204.
3. Missing and invalid tokens are indistinguishable (identical 401 body).
4. Redacted fields are listed in `__meta.redacted_fields` rather than omitted silently.

## Health

`service` reads `https://status.rippling.com/api/v2/summary.json` (a real Statuspage, page id
`dtj0jj1f02xs`). It weights the **Platform API** component fully, lets "Rippling App" and
"Authentication" degrade but never down, and ignores the page-wide indicator (it covers payroll and
other products). Unknown page id, missing component or a bad body is `unknown`, never `down`.
`quota` is declared unavailable (`informational`): Rippling exposes no quota endpoint.

## Icon

`assets/icon.svg` embeds Rippling's own mark verbatim (PNG from its published apple-touch-icon,
`https://www.rippling.com/apple-touch-icon.png`). Format only with `deno task fmt`.

## Left out (unconfirmed or out of scope)

OAuth, draft hires, file uploads, worker changes, time tracking, payroll runs, and the platform,
agents, functions and developer-program endpoints.
