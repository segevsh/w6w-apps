# Workflowy

Capture, edit, organise and export [WorkFlowy](https://workflowy.com) outline nodes over the public
API v1 (`https://workflowy.com/api/v1`). Reference: <https://workflowy.com/api-reference/>.

- **Auth:** API key, sent as `Authorization: Bearer <key>` (stamped by `sign` only). Generate one at
  <https://workflowy.com/api-key/>.
- **Network:** `workflowy.com` (API) and, for the unsigned status check only,
  `status.workflowy.com`.
- **Icon:** `assets/icon.svg` is the vendor's own mark, served verbatim from
  `workflowy.com/media/home/images/workflowy-logo.svg` (no `favicon.svg` exists; the
  apple-touch-icon is PNG only).

## Actions (12)

| Action               | Endpoint                          | Notes                                        |
| -------------------- | --------------------------------- | -------------------------------------------- |
| `node-create`        | `POST /nodes`                     | Returns `{id}` only. Markdown in `name`.     |
| `node-update`        | `POST /nodes/:id`                 | Partial: unset fields unchanged.             |
| `node-get`           | `GET /nodes/:id`                  | Id, short id, or calendar key.               |
| `node-list`          | `GET /nodes?parent_id=`           | Sorted by `priority` (API is unordered).     |
| `node-delete`        | `DELETE /nodes/:id`               | Permanent.                                   |
| `node-move`          | `POST /nodes/:id/move`            |                                              |
| `node-complete`      | `POST /nodes/:id/complete`        |                                              |
| `node-uncomplete`    | `POST /nodes/:id/uncomplete`      |                                              |
| `node-mirror-create` | `POST /nodes/:id/mirror`          | Parent must be a full node id.               |
| `node-mirror-delete` | `DELETE /nodes/:id/mirror`        | Origin is left intact.                       |
| `nodes-export`       | `GET /nodes-export`               | Flat list; **1 request per minute**.         |
| `targets-list`       | `GET /targets`                    | Shortcut keys and system targets.            |

## Health checks

| Check        | What                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| `service`    | `status.workflowy.com/api/v2/summary.json` (Statuspage, verified: page "WorkFlowy", 404 on a bogus path). The `API` component decides the verdict. |
| ~~`rate-limit`~~ | Declared unavailable (informational): no quota or remaining-count is published.           |
| `auth:api-key` (derived) | `GET /targets` — needs a credential, takes no params, returns no secret material. |

## Things that would cost a day

1. **Mutations return almost nothing.** Create answers `{item_id}`; update, delete, move, complete
   and uncomplete answer `{status:"ok"}`. Fetch with `node-get` if you need the node.
2. **Lists are unordered.** `node-list` sorts by `priority`; `nodes-export` is flat and unsorted
   (rebuild the tree from `parent_id` and `priority`).
3. **Parent addressing is not uniform.** Create, move and list accept keys (`inbox`, `today`,
   `tomorrow`, `next_week`, `YYYY[-MM[-DD]]`, shortcut keys, `None` for top level); mirror needs a
   full node id. Calendar keys 404 on list/get until the node exists.
4. **Errors are `{"errors": "<string>"}`** (plural key, bare string), HTTP 401 for a bad key.

## Not covered

The reference documents no webhooks, search or user-profile endpoint, so none are exposed.
