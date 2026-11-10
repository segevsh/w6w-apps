# Zoho WorkDrive

- **Triggers** — 4 (poll)

## Triggers

| Key                                 | Mechanism       | Source             | What the run gets                          |
| ----------------------------------- | --------------- | ------------------ | ------------------------------------------ |
| `new-team-member`                   | poll snapshot   | `team-member-list` | Each member newly added to a team          |
| `new-team-folder` — New Team Folder | Poll (snapshot) | `team-folder-list` | Each team folder newly created in the team |
| `new-file` — New File in Folder | Poll (snapshot) | `file-list` | Each file or sub-folder newly added to a folder |
| `new-team-folder-file` — New File in Team Folder | Poll (snapshot) | `team-folder-file-list` | Each file or folder newly added at the top level of a team folder |

`new-team-folder` reads every page of the team's folders (`page[limit]` 50, `page[offset]`; "Without
specifying any pagination parameter, Listing APIs usually return 50 items by default, which is the
allowed maximum limit") and diffs the ids; the endpoint documents no sort or created filter.
Sources:
[Get team folders in a team](https://www.zoho.com/workdrive/developer/docs/api/v1/get-team-folders-in-a-team.html),
[Pagination](https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-pagination.html),
verified 2026-11-10.

`new-file` (required `folderId`) and `new-team-folder-file` (required `teamFolderId`) snapshot a
folder, or the top level of a team folder, the same way: every page by offset, 50 per request, ids
diffed, and more than 1000 entries stops with an error rather than truncating. The pagination page
documents offset paging and a cursor mode whose listings "won't follow the folder-first approach";
no sort or created filter is documented for either listing (their own reference pages could not be
located), so the client's `sort` slot is not used. Source:
[Pagination](https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-pagination.html),
checked 2026-11-10.

Not covered: `team-list` (the teams one user belongs to, account structure), `record-search`
(free-text search over files has no documented order or created filter), `file-version-list` (versions of one file),
`share-link-list` (per-file external links whose URLs are share secrets).

Pick the team with the `teamId` trigger param. Get Team Members ("This API fetches all members of a
WorkDrive team") documents no paging parameters, so the roster is one request and is snapshotted for
additions: https://www.zoho.com/workdrive/developer/docs/api/v1/get-team-members.html (verified
2026-11-09).

Manage Zoho WorkDrive files, folders, team folders, search and external download links.

Scoped to **Zoho WorkDrive specifically**. This pack also ships `zoho` (CRM), `zohobooks`,
`zohodesk`, `zoho-sheet` and others — separate products with separate API surfaces.

- **Categories** — documents, storage
- **Auth methods** — oauth2 (authorization code), one per Zoho data centre — **nine**
- **Actions** — 24
- **Egress allowlist** — `www.zohoapis.{com,eu,in,com.au,jp,com.cn,ae,ca,sa}`

## Actions

| Group             | Actions                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User              | `user-get`                                                                                                                                                                                        |
| Teams             | `team-list`, `team-get`, `team-member-list`                                                                                                                                                       |
| Team folders      | `team-folder-list`, `team-folder-get`, `team-folder-create`, `team-folder-file-list`                                                                                                              |
| Files and folders | `file-get`, `file-list`, `folder-create`, `file-rename`, `file-move`, `file-copy`, `file-trash`, `file-restore`, `file-delete-permanent`, `file-favorite-set`, `file-version-list`, `file-upload` |
| Search            | `record-search`                                                                                                                                                                                   |
| External links    | `share-link-create`, `share-link-list`, `share-link-revoke`                                                                                                                                       |

Typical flow: `team-list` → `team-folder-list` → `file-list` (folder id from the previous step).
List actions return `{ items, hasNext, next }`; every other action returns `{ item }` holding the
JSON:API `data` of the response.

## What was verified, and where

Everything was read from the vendor reference
(`https://www.zoho.com/workdrive/developer/docs/api/v1/*.html`, the 233 pages the sitemap lists —
the overview pages are shells without nav links) on 2026-10-06, plus unauthenticated probes of the
live API.

- Base `https://www.zohoapis.<tld>/workdrive/api/v1`, header
  `Authorization: Zoho-oauthtoken <token>` (stamped only in `sign`).
- **JSON:API**: bodies are `{"data":{"type":"files","attributes":{…}}}` sent as
  `application/vnd.api+json`; responses carry `data` (object or array), `links`, `meta`. Requests
  send `Accept: application/vnd.api+json` (the vendor says a missing header may be answered 415).
- **Pagination**: offset (`page[offset]`, `page[limit]`, max 50 for file listings) or cursor
  (`page[next]=0`, then the returned `next`, until `hasNext` is false; up to 1000 per page).
- **One PATCH, six jobs**: rename, move, trash (`status` 51), restore (`status` 1), delete
  permanently (`status` 61) and favorite all `PATCH /files/{id}`.
- `file-copy`: the PATH id is the _destination_ folder; the source id is `attributes.resource_id`.
- `team-folder-create`: `attributes.parent_id` is the _team_ id.
- The vendor's "mark as favorite" page says `favorite: true` "removes" — a copy-paste slip; the
  "remove from favorites" page uses `false`, so `file-favorite-set` sends `true` to mark.

## Regional accounts

Pick the connection method matching the domain of your WorkDrive URL (`workdrive.zoho.com` → United
States, `workdrive.zoho.eu` → Europe, `.in`, `.com.au`, `.jp`, `.com.cn`, `.ae`, `.sa`; Canada is
`zohocloud.ca`). The vendor lists nine data centres. The API host is recorded on the connection when
you connect; actions read it back.

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

`assets/icon.svg` is byte-identical to `apps/zoho/zoho/assets/icon.svg`, as every `zoho-*` sibling
uses the Zoho mark. The WorkDrive product wordmark
(`zohowebstatic.com/.../productlogos/workdrive.svg`) is a wide wordmark and was not used.

## Not covered

Chunked large-file upload (> 250 MB, session API), binary download (`download.zoho.com`, a separate
host), `Check-in/out`, convert/unzip, workflows, data templates and custom fields, collections,
comments, groups, labels, sharing to members/groups/team, team administration (members, roles,
settings), team-folder members/archiving, favorites/recent/trash listings, and zip/multi-file
operations. The upload response shape is shown garbled in the vendor's own example, so the upload
action returns the parsed `data` (or the whole body if absent).
