# Zoho WorkDrive

Manage Zoho WorkDrive files, folders, team folders, search and external download links.

Scoped to **Zoho WorkDrive specifically**. This pack also ships `zoho` (CRM), `zohobooks`,
`zohodesk`, `zoho-sheet` and others — separate products with separate API surfaces.

- **Categories** — documents, storage
- **Auth methods** — oauth2 (authorization code), one per Zoho data centre — **nine**
- **Actions** — 24
- **Egress allowlist** — `www.zohoapis.{com,eu,in,com.au,jp,com.cn,ae,ca,sa}`

## Actions

| Group | Actions |
| --- | --- |
| User | `user-get` |
| Teams | `team-list`, `team-get`, `team-member-list` |
| Team folders | `team-folder-list`, `team-folder-get`, `team-folder-create`, `team-folder-file-list` |
| Files and folders | `file-get`, `file-list`, `folder-create`, `file-rename`, `file-move`, `file-copy`, `file-trash`, `file-restore`, `file-delete-permanent`, `file-favorite-set`, `file-version-list`, `file-upload` |
| Search | `record-search` |
| External links | `share-link-create`, `share-link-list`, `share-link-revoke` |

Typical flow: `team-list` → `team-folder-list` → `file-list` (folder id from the previous step).
List actions return `{ items, hasNext, next }`; every other action returns `{ item }` holding the
JSON:API `data` of the response.

## What was verified, and where

Everything was read from the vendor reference
(`https://www.zoho.com/workdrive/developer/docs/api/v1/*.html`, the 233 pages the sitemap lists —
the overview pages are shells without nav links) on 2026-10-06, plus unauthenticated probes of the
live API.

- Base `https://www.zohoapis.<tld>/workdrive/api/v1`, header `Authorization: Zoho-oauthtoken <token>`
  (stamped only in `sign`).
- **JSON:API**: bodies are `{"data":{"type":"files","attributes":{…}}}` sent as
  `application/vnd.api+json`; responses carry `data` (object or array), `links`, `meta`. Requests
  send `Accept: application/vnd.api+json` (the vendor says a missing header may be answered 415).
- **Pagination**: offset (`page[offset]`, `page[limit]`, max 50 for file listings) or cursor
  (`page[next]=0`, then the returned `next`, until `hasNext` is false; up to 1000 per page).
- **One PATCH, six jobs**: rename, move, trash (`status` 51), restore (`status` 1), delete
  permanently (`status` 61) and favorite all `PATCH /files/{id}`.
- `file-copy`: the PATH id is the *destination* folder; the source id is `attributes.resource_id`.
- `team-folder-create`: `attributes.parent_id` is the *team* id.
- The vendor's "mark as favorite" page says `favorite: true` "removes" — a copy-paste slip; the
  "remove from favorites" page uses `false`, so `file-favorite-set` sends `true` to mark.

## Regional accounts

Pick the connection method matching the domain of your WorkDrive URL (`workdrive.zoho.com` → United
States, `workdrive.zoho.eu` → Europe, `.in`, `.com.au`, `.jp`, `.com.cn`, `.ae`, `.sa`; Canada is
`zohocloud.ca`). The vendor lists nine data centres. The API host is recorded on the connection
when you connect; actions read it back.

## Errors and the auth probe

Errors are `{"errors":[{"id":"F7003","title":"Invalid OAuth token."}]}`. The connection test calls
`GET /users/me` (scope `WorkDrive.users.READ`; the body is the caller's profile, never the
credential) and classifies by the vendor's error `id` — `F7003` bad token, `F7004` missing scope —
not the HTTP status: a request with **no** token is answered `500 INVALID_TICKET`.

## Health

- `service` — the **Zoho WorkDrive** component on Zoho's StatusIQ feed
  (`https://us.zohostatus.com/rss`, entry `Zoho WorkDrive - Operational`); unsigned, host-parsed.
- `auth:oauth2-<region>` — derived from the connection test above.
- `quota` — declared **unavailable** with `severity: "informational"`: WorkDrive documents no
  rate-limit response header to probe.

## Icon

`assets/icon.svg` is byte-identical to `apps/zoho/assets/icon.svg`, as every `zoho-*` sibling uses
the Zoho mark. The WorkDrive product wordmark
(`zohowebstatic.com/.../productlogos/workdrive.svg`) is a wide wordmark and was not used.

## Not covered

Chunked large-file upload (> 250 MB, session API), binary download (`download.zoho.com`, a separate
host), `Check-in/out`, convert/unzip, workflows, data templates and custom fields, collections,
comments, groups, labels, sharing to members/groups/team, team administration (members, roles,
settings), team-folder members/archiving, favorites/recent/trash listings, and zip/multi-file
operations. The upload response shape is shown garbled in the vendor's own example, so the upload
action returns the parsed `data` (or the whole body if absent).
