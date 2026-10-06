# CleverReach

Manage CleverReach email marketing from a workflow: add, update, upsert, activate, deactivate and
delete receivers (subscribers); manage groups (receiver lists); create attributes; tag receivers;
read mailings and their reports; and manage the blacklist. Built on the REST API v3
(`https://rest.cleverreach.com/v3`).

App id `io.w6w.cleverreach` · categories `marketing`, `communication` · egress
`rest.cleverreach.com` (API and token endpoint) and `status.cleverreach.com` (status check only).

## Auth setup

Two methods, both ending in `Authorization: Bearer <token>` stamped by `sign`:

1. **Access token** (`access-token`, bearer). In CleverReach open **Account > Extras > REST API**,
   create an OAuth app, and use its "Test Process Now" button to receive a token. Paste it in. The
   vendor's sample response shows `expires_in: 31536000` (a year); when it lapses, paste a new one.
2. **OAuth app** (`client-credentials`, custom). Paste the app's Client ID and Client Secret; the
   app POSTs them to `https://rest.cleverreach.com/oauth/token.php` with
   `grant_type=client_credentials`, stores the token and re-mints it before it expires (`refresh`).

Caveat on method 2: the vendor's authentication guide documents only the authorization-code flow
and its refresh grant. Probed 2026-10-06 without a real key, `grant_type=client_credentials` is a
**supported** grant (a made-up grant answers `unsupported_grant_type`; this one answers
`invalid_client`), and the endpoint reads the id and secret from the form body. The success body
(`access_token`, `expires_in`) is taken from the guide's sample and could not be confirmed against
a live key. If it misbehaves, use method 1.

A token controls the **whole account**, so treat it like a password.

The connection test calls `GET /v3/debug/ttl` ("retrieve the ttl of the token"), which needs no
scope and mutates nothing. Its 200 body is undocumented, so it is never read or echoed; failure is
classified from the vendor's own error body (`{"error":{"code":401,"message":"Unauthorized"}}`
for the API, `{"error":"invalid_client",…}` for the token endpoint), and the status is only a hint.

## Actions (24)

| Group | Actions |
| --- | --- |
| Account | `whoami` |
| Groups | `group-list`, `group-get`, `group-create`, `group-update`, `group-delete` |
| Receivers | `receiver-list`, `receiver-get`, `receiver-add`, `receiver-update`, `receiver-upsert`, `receiver-delete`, `receiver-set-active` |
| Tags | `receiver-tags-add`, `tag-list` |
| Attributes | `attribute-list`, `attribute-create` |
| Mailings and reports | `mailing-list`, `mailing-get`, `report-list`, `report-get` |
| Blacklist | `blacklist-list`, `blacklist-add`, `blacklist-remove` |

Things worth knowing:

- **The response schemas are not documented.** The Swagger document types almost every 200 as a
  bare `string` or `array<string>`, so actions return what the vendor sent, parsed. Lists come back
  as `{items, count}` (a non-array body is kept under `raw`); single records as `{item}`;
  mutations as `{result}`.
- **Receiver bodies are the receiver object itself.** The Swagger body model is a `postdata`
  placeholder; the vendor's example, and this app, send `{"email": …, "attributes": …,
  "global_attributes": …, "tags": […]}` unwrapped.
- **Mind `registered`, `activated`, `deactivated`.** Omit all three on create and the receiver is
  ACTIVATED. Set `activated` only to skip double-opt-in. A non-zero `deactivated` makes a receiver
  inactive for good. Timestamps accept Unix seconds or ISO 8601.
- **Pagination is per endpoint.** `receiver-list` is zero-based with `pagesize` up to 5000 and
  returns `nextPage` (null once a page is short); `report-list` and `tag-list` take `page`;
  `mailing-list` only honours `page` when `state` is not `all` (and then caps `limit` at 100).
- **Receivers are addressed by id or email**; emails are URL-encoded.
- **`receiver-delete`'s `groupId`** is sent as the vendor's `group_id` query, which the spec leaves
  unexplained. Try a group-scoped delete on a test account first.

## Health checks

- `service` reads `status.cleverreach.com/api/v2/summary.json`: a real Atlassian Statuspage
  (`page.name` is `CleverReach`; a bogus sibling path 404s). It has a component literally named
  `Rest-API`, which decides the verdict; the other 11 are reported but never move it. If that
  component ever disappears, the page-level indicator is used.
- `api` is an unsigned `GET /v3/debug/ttl`. CleverReach's schema-correct JSON 401 proves the API is
  serving, so it passes; a 5xx or a non-JSON body is `down`.
- `auth:access-token` / `auth:client-credentials` are derived from each method's `test`.

## Not covered

Left out rather than guessed (each has a documented endpoint in the Swagger; none was needed for
the core surface or its response is undocumented enough to be unsafe to reshape):

- **Forms** (`/forms*`, 7 operations): all flagged deprecated by the vendor.
- Receiver extras: `insert`, `update`, `updateplus`, `upsertplus`, `clone`, `change email`,
  `isvalid`, bulk `delete`, `bounced`, `groups`, remove tags, events and orders.
- Groups: `stats`, `advancedstats`, `clear`, per-group blacklist, filters/segments.
- Attributes: get/update/delete one, per-group attributes, per-receiver attribute writes, `limits`.
- Mailings: create/update, links, send preview, templates; reports: stats, receiver lists, delete.
- Clients (agency) and account endpoints, `mycontent`, categories/channels, `oauth` token delete,
  and the separate Flow API (`/flow`, captcha) on the dedicated Flows service.

## Tests

`deno task test` runs the unit tests: each action, both auth methods, both health checks and the
client helpers, against a mocked `HookContext` (queued fake `ctx.fetch`, no-op `ctx.log`).
