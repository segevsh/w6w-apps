# OnePageCRM

Manage contacts, companies, deals, next actions, notes and calls on
[OnePageCRM](https://www.onepagecrm.com), and look up the ids those actions take.

- App id `io.w6w.onepagecrm`, category `crm`.
- Built against the vendor's OpenAPI document
  (<https://raw.githubusercontent.com/OnePageCRM/swagger/master/swagger.yaml>, fetched 2026-10-06),
  the developer portal (`/api/errors`, `/api/rate-limits`, `/api/pagination`,
  `/api/partial-updates`) and live probes the same day. Nothing is inferred from another app.
- Network: `app.onepagecrm.com` only (API `/api/v3` and the status probe share the host).
- Icon: the vendor's `apple-touch-icon.png`, byte-for-byte (180x180 PNG).

## Authentication

One method, **User ID & API Key** (`type: "basic"`): HTTP Basic with the `user_id` as username and
the `api_key` as password (`Authorization: Basic base64("<user_id>:<api_key>")`). Both are on
<https://app.onepagecrm.com/app/api>. OAuth 2.1 exists but is closed-beta/by request (the vendor
registers clients), so it is not modelled.

**Credential check (`test`)** is `GET /users` (the team list; it does not echo the credential). It
passes only on the documented `data: [ {user: …} ]` shape, never on a bare HTTP 200, and decides
"rejected" from the body's `error_name` (`invalid_login`, `invalid_auth_token`,
`authorization_data_not_found`), not from the status code.

`GET /bootstrap` is deliberately **not** used anywhere: it looks like the natural whoami, but its
response carries `auth_key`, the caller's own API key.

## Actions (23)

| Resource | Actions |
|---|---|
| Contact | `list-contacts`, `get-contact`, `create-contact`, `update-contact`, `delete-contact`, `assign-contact-tag`, `change-contact-status` |
| Company | `list-companies`, `get-company` |
| Deal | `list-deals`, `get-deal`, `create-deal`, `update-deal` |
| Next action | `list-actions`, `create-action`, `mark-action-done` |
| Note / call | `list-notes`, `create-note`, `create-call` |
| Lookups | `list-users`, `list-statuses`, `list-lead-sources`, `list-pipelines` |

List actions return `{ items, totalCount, page, perPage, maxPage }`. `items` keeps the vendor's
wrappers (`{contact, next_actions, …}`, `{deal, contacts}`, `{action}` …), so the related blocks
requested through `fields` are not lost. Pagination is `page` (1-indexed) and `perPage` (max 100,
default 10); stop when `page` reaches `maxPage`.

Anything that creates a record (`create-contact`, `create-deal`, `create-action`, `create-note`,
`create-call`) is `idempotent: false`: the API accepts no idempotency key, so a retry duplicates.

### Things worth knowing

- **Updates are partial by default here.** The vendor's `PUT` replaces the whole record unless
  `partial=true`: a contact update that omits `tags`, `emails` or `status_id` clears them (and resets
  the status to `lead`). `update-contact` and `update-deal` send `partial=true` unless you set
  `Replace whole record`. Arrays (emails, phones, tags, addresses) always replace, never merge. The
  vendor's OpenAPI text states `partial` for contacts; the portal's partial-updates page states it
  for `PUT` generally, which is what `update-deal` relies on.
- **HTTP status and body status disagree.** Bad credentials are HTTP 401 with `"status": 400` in
  the body; success has `"status": 0`. The client classifies from `error_name`.
- **Rate limiting is two different signals.** The request-rate throttle is **HTTP 403 with a
  `text/plain` body `Rate Limit Exceeded`**; 429 is the concurrent-connection limit. A 403 with the
  JSON envelope is a real permission error. The client reports a throttle as such (it does not
  retry). There is no per-day quota and no rate-limit header.
- **Send `Accept: application/json`.** Paths are the spec's (no `.json` suffix); without that
  header an unauthenticated call answers `application/xml`.
- Contact ids and every other id are opaque strings (BSON-style), returned by the list actions.
- `delete-contact` with `Undo` restores the most recent deletion (the window is plan-dependent, 1 to
  60 days).

### Not covered

Left out because they were not needed for the core flows or could not be confirmed with confidence:
attachments and photos (multipart / S3 form uploads), meetings, relationships, webhooks
(read-only in the API), notifications, filters, custom/deal/company field administration, the
10,000+ contact cascade endpoints, company update/linking, bulk contact delete, closing a sales
cycle, OQL. The contact-create description also mentions `next_action_name`/`next_action_date`
shortcuts that are absent from the request schema, so they are not exposed: create the first action
with `create-action`. The one deprecated field in the API (the deal cost-required flag) is not used.

## Health checks

| Check | What it does |
|---|---|
| `service` | The vendor's own uptime probe. OnePageCRM has no Statuspage/Instatus feed; <https://developer.onepagecrm.com/status/> is a custom page whose script loads `https://app.onepagecrm.com/status_check/<timestamp>.png`. **A 1x1 PNG = up**, any other image = maintenance, no image = unreachable. The check reads the PNG's IHDR width. `GET /status_check/` itself is a 404 HTML page; only the `<anything>.png` form exists. The page also embeds a Pingdom report (HTML, not machine-readable). It is a probe of the application host, not API-specific. |
| `api` | Unsigned `GET /users`. A 401 carrying OnePageCRM's own error envelope (`error_name`) is a pass: it proves the API is serving. HTML, a 5xx or `service_unavailable` is down; JSON without `error_name` is unknown; the plain-text throttle gives no verdict. |
| ~~`quota`~~ | Declared unavailable (informational): no rate-limit header, usage endpoint or daily quota. |
| `auth:basic` | Derived from the Auth `test` hook above. |

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
