# HoneyBook

Clientflow / CRM for service businesses, over the **HoneyBook API v3**
(`https://api.honeybook.com/api/v3`). 38 actions, OAuth 2.0 (authorization code + PKCE), one health
check.

> **Access is by request.** HoneyBook's API is a marked preview: it "is currently private", there is
> no self-service sign-up, and applications are registered by HoneyBook through a request-access form
> on <https://developers.honeybook.com/>. This app was built from the vendor's public OpenAPI 3.0
> document (`info.version` `v3`, fetched 2026-10-05 from the date-versioned
> `assets-20261005-110557/openapi.json`) and has **not** been exercised against a live account.

Everything here — every path, verb, parameter, body field and enum — comes from that document.
Nothing was inferred from a sibling app or a directory listing.

## Authentication

| | |
|---|---|
| Flow | `authorizationCode` with PKCE (the spec's only flow) |
| Authorize | `https://oauth.honeybook.com/oauth2/auth` |
| Token / refresh | `https://oauth.honeybook.com/oauth2/token` |
| Revoke | `https://oauth.honeybook.com/oauth2/revoke` |
| API auth | `Authorization: Bearer <access_token>` (stamped by `sign`) |

Scopes: `openid`, `honeybook.api` (necessary, never sufficient), `offline_access` (refresh token),
plus `contacts.write`, `projects.read`, `projects.write`, `workspaces.read`, `workspaces.write`.

**HoneyBook issues no client secret.** Clients authenticate at the token endpoint with
`private_key_jwt` (RFC 7523): the registered client publishes a JWKS URL and signs a
`client_assertion`. That is a property of the host's OAuth client registration for this app, not of
the app code; a host whose token exchange only knows `client_secret` cannot complete the exchange
until it supports `private_key_jwt`. Redirect URIs must be HTTPS, exact-match, no wildcards.

`oauth.honeybook.com` is an OAuth endpoint host and is allowed implicitly; `network.allow` is only
`api.honeybook.com`.

## Actions

| Group | Actions |
|---|---|
| Contacts | `contact-create`, `contact-update`, `contact-delete`, `contact-interaction-set`, `contact-tag-add`, `contact-tag-remove` |
| Pipeline | `pipeline-list`, `pipeline-counts-get` |
| Workspaces | `workspace-list`, `workspace-counts-get`, `workspace-exists`, `workspace-get`, `workspace-update`, `workspace-delete`, `workspace-deletable-get`, `workspace-member-list`, `workspace-member-add`, `workspace-member-remove`, `workspace-tag-add`, `workspace-tag-remove`, `workspace-archive`, `workspace-unarchive`, `workspace-book` |
| Projects | `project-list`, `project-create`, `project-get`, `project-update`, `project-date-create`, `project-date-update`, `project-date-delete`, `project-payroll-employee-counts-get`, `project-payroll-employee-list`, `project-payroll-employee-add`, `project-payroll-employee-remove`, `project-space-add`, `project-space-remove`, `project-conflicts-get`, `project-workspace-create` |

That is every operation in the document (38 operations across 27 paths).

## Findings worth knowing

1. **There is no way to read a contact.** The spec has `POST /contacts`, `PATCH`/`DELETE
   /contacts/{id}`, interaction and tag writes — and no `GET /contacts` or `GET /contacts/{id}`. The
   scope list has `contacts.write` and no `contacts.read`. A contact is read back only through the
   `include` the write returned, or through a workspace's member list (`include=contact`).
2. **A permission failure is a 404, byte-identical to a missing record**; only a missing OAuth scope
   is a 403 (`HBInsufficientScopeError`). A record that existed and was deleted answers 410. Error
   messages from this app name the vendor's `error_type` and explain the 404 ambiguity.
3. **Query arrays are one comma-separated value** (`style: form, explode: false`), while the
   `include` relations on write endpoints travel in the JSON **body**, not the query string.
4. **The credential probe is `GET /workspaces/any`** (`{ "has_any": boolean }`, no secret in the
   body). It needs `workspaces.read`, so the verdict is read from `error_type`, not the status code:
   `HBInsufficientScopeError` means the token was accepted (pass), `HBInvalidJWTError` / 401 is a dead
   token, and a 200 that is not the `{ has_any }` shape is not a pass.

## Health checks

- `service` — **informational**. `status.honeybook.com` is real and is a **Better Stack** page, not
  Statuspage: `/api/v2/summary.json` 301s to `/`, and the machine-readable index is `/index.json`
  (JSON:API; `data.attributes.company_name` is `HoneyBook`, plus 11 `status_page_resource`
  components). The page is **not** a statement about the API host: none of the 11 components is "API"
  (nearest: System Access & Stability, CRM & Project Management), hence `informational`. The status
  host is declared in the check's own `network.allow`, never in the app's.
- `auth:oauth2` — derived from `test` (above).
- No quota check: the document publishes no rate-limit headers or limits.

## Notes

- `include` and `max_*` parameters embed related records in write/read responses; a relation not
  requested comes back `null`.
- List pages are `{ data, pagination }` with `page` (1-indexed), `per_page` (max 100), `total_items`,
  `total_pages`, `last_page`.
- Dates are `YYYY-MM-DD`; date-times are ISO 8601; `budget` is an integer.
- Retry guidance from the vendor: retry 500/503 and `is_timeout: true` with backoff; never retry
  400/401/403/404/409/410 (401 once, after refreshing the token).
- Icon: `assets/icon.svg` embeds the vendor's real 256x256 PNG mark (honeybook.com's
  apple-touch-icon) base64-wrapped in an SVG; no verbatim vendor SVG was found.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
