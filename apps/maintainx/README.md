# MaintainX

Work orders, assets, locations, parts, users, teams, vendors and meters in
[MaintainX](https://www.getmaintainx.com), over the REST API v1
(`https://api.getmaintainx.com/v1`). Every path, verb, parameter and body field
comes from the vendor's OpenAPI 3.0 document (`/v1/openapi.json`, fetched
2026-10-06) and was spot-checked against the live host. App id `io.w6w.maintainx`.

- **Triggers** — 12 (poll)

## Auth

One method, `api-key` (type `bearer`): `Authorization: Bearer <key>`, where the key
is a JWT.

1. In MaintainX open **Settings > Integrations > API Keys** and generate a key.
   API access requires a Premium or Enterprise plan.
2. Paste it into the connection's *API Key* field. The key acts as the user who
   created it, so use a dedicated service-account user.

The credential is only ever read by the `sign` hook. The connection is labelled
with the organization name (read from `GET /organizations` after connecting).

**Multi-organization keys.** Every action takes an optional *Organization ID*,
sent as `x-organization-id`. Leave it empty for a single-organization key.

## Actions (20)

| Key | Endpoint | Notes |
|---|---|---|
| `workorder-list` | `GET /workorders` | filters: status, priority, asset, location, assignee, team, category, dates, sort, expand |
| `workorder-get` | `GET /workorders/{id}` | unwraps `{ workOrder }` |
| `workorder-create` | `POST /workorders` | non-idempotent; assignees as ids or emails |
| `workorder-update` | `PATCH /workorders/{id}` | sends only set fields; status is separate |
| `workorder-status-set` | `PATCH /workorders/{id}/status` | OPEN, IN_PROGRESS, ON_HOLD, DONE, CANCELED |
| `workorder-comment-list` | `GET /workorders/{id}/comments` | |
| `workorder-comment-add` | `POST /workorders/{id}/comments` | non-idempotent |
| `asset-list` | `GET /assets` | |
| `asset-get` | `GET /assets/{id}` | unwraps `{ asset }` |
| `asset-create` | `POST /assets` | non-idempotent |
| `location-list` | `GET /locations` | |
| `location-get` | `GET /locations/{id}` | unwraps `{ location }` |
| `location-create` | `POST /locations` | non-idempotent |
| `part-list` | `GET /parts` | |
| `user-list` | `GET /users` | |
| `team-list` | `GET /teams` | |
| `vendor-list` | `GET /vendors` | |
| `meter-list` | `GET /meters` | |
| `meter-readings-add` | `POST /meterreadings` | batch endpoint, see below |
| `organization-list` | `GET /organizations` | |

List actions return the vendor's array under its own key (`workOrders`, `assets`,
`locations`, `parts`, `users`, `teams`, `vendors`, `meters`, `comments`,
`organizations`) plus `nextCursor` (`null` on the last page); the vendor's
`nextPageUrl` is dropped. Pass `nextCursor` back as `cursor`. `limit` is 1-200
(vendor default 100, prefilled to 50 here).

## Things worth knowing

- **Array filters are repeated keys** (`statuses=OPEN&statuses=DONE`), not comma lists.
- **Meter readings: use the batch endpoint.** `POST /meters/{id}/readings` is limited
  to 10 requests per 24 hours for manual meters and 1 per 10 seconds for automated
  ones; `meter-readings-add` always calls `POST /meterreadings`.
- **Custom fields** (`extraFields`) are keyed by the exact custom-field label,
  values are strings.
- **Work-order status** cannot be changed through `PATCH /workorders/{id}`; use
  `workorder-status-set`. `SKIPPED` is returned by the API but cannot be set.
- Create endpoints take no idempotency key; a retry creates a duplicate.

## Not yet covered

Left out to keep the surface focused, not because they are unavailable: updating
and deleting assets/locations/parts/vendors/users/teams, the `/external/{externalId}`
variants, attachments and thumbnails (`PUT .../attachments/{filename}`), work-order
costs, sub-work-orders, procedures and procedure templates, part status, work
permits, work requests and portals, maintenance plans, meter triggers,
purchase orders, part transfer requests, categories, asset statuses / criticalities
/ custom statuses, manufacturers and models, customers and vendor contacts,
conversations and messages, custom-field definitions, root-cause-analysis
reports, work shifts, and webhook `subscriptions`.

## Icon

`assets/icon.png` is the 48x48 frame (the largest of three) of the vendor's own
favicon, `https://app.getmaintainx.com/favicon.ico` (7,406-byte ICO), re-encoded
as PNG without alteration of the artwork. The apex `getmaintainx.com` 404s every
asset path.

## Health checks

| Check | What it does |
|---|---|
| `auth:api-key` (derived) | `GET /organizations?limit=1`, classified from the response body. An unauthenticated call answers `401 text/html` with `Invalid authentication token` (credential never attached); a bad key answers `401 application/json` `{"error":"Invalid token"}`. A 200 must carry an `organizations` array. The response contains no credential material. |
| `service` | Better Stack status page `https://status.getmaintainx.com/en/index.json` (verified: `company_name: "MaintainX"`, resources `MaintainX App`, `REST API`, `GraphQL API`, `Website`). The verdict is the `REST API` component; the rest are reported as detail. `/api/v2/summary.json` 302s, so this is not Statuspage. The endpoint answers JSON with `content-type: text/html`. |
| `quota` | Declared unavailable (`informational`): the OpenAPI document and live responses expose no rate-limit headers. |

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-work-order` — New Work Order | Poll | `workorder-list` | Each newly created work order |
| `new-or-updated-work-order` — New or Updated Work Order | Poll | `workorder-list` | Each work order that was created or edited |
| `new-asset` — New Asset | Poll | `asset-list` | Each newly created asset |
| `new-or-updated-asset` — New or Updated Asset | Poll | `asset-list` | Each asset that was created or edited |
| `new-part` — New Part | Poll | `part-list` | Each newly created spare part |
| `new-or-updated-part` — New or Updated Part | Poll | `part-list` | Each part that was created or edited (stock changes included) |
| `new-location` — New Location | Poll | `location-list` | Each newly created location |
| `new-meter` — New Meter | Poll | `meter-list` | Each newly created meter |
| `new-team` — New Team | Poll | `team-list` | Each newly created team |
| `new-user` — New User | Poll | `user-list` | Each newly added user |
| `new-vendor` — New Vendor | Poll | `vendor-list` | Each newly created vendor |
| `new-work-order-comment` — New Work Order Comment | Poll | `workorder-comment-list` | Each new comment on one work order (Work order ID param) |

`GET /workorders`, `/assets` and `/parts` take an explicit `sort` (`-createdAt` / `-updatedAt`; a `-` prefix is descending), so those triggers send `sort=-createdAt` or `sort=-updatedAt` with `limit=100` and read the first page. The edited-record triggers dedupe on `id:updatedAt`. `GET /locations`, `/meters`, `/teams`, `/users`, `/vendors` and `/workorders/{id}/comments` document no sort or since filter, so those triggers read the whole list through `nextCursor` (`limit=200`, at most 25 pages = 5000 rows, more throws) and report ids not seen at the last check. The first check records what exists without firing.

Not covered: `organization-list` (the organizations the API key can reach: tenant configuration, not business records).

Source: [vendor OpenAPI document](https://api.getmaintainx.com/v1/openapi.json) (verified 2026-11-10).
