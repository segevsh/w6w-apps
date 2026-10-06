# Wistia

Manage Wistia video from a workflow: list, rename, tag, move and delete media, import a video from a
URL, manage folders, read captions, and pull per-video and account stats. Built on Wistia's current
Data API (`https://api.wistia.com/modern`), not the legacy `/v1` surface, which still answers.

App id `io.w6w.wistia` · categories `video`, `marketing`, `analytics` · egress `api.wistia.com` only.

## Auth setup

One method, **API Token** (`api-token`, bearer). In Wistia open **Account Settings > API Access**,
create a token and paste it into the connection.

- Read actions need "Read all folder and media data".
- Write actions (update, delete, move, import, folders) need "Read, update & delete anything".
- The detailed stats actions (`media-stats-get`, `stats-account-*`) need "Read detailed stats".
- Background job polling and tag listing need "Read all data".

The connection test calls `GET /modern/account`, which Wistia documents as needing *any* scope and
which returns only the account name, URL and counts, so a narrowly scoped token passes and the token
is never echoed. A failure is classified from the body's `code` (`unauthorized_credentials`,
`account_inactive`, ...), never from the status alone.

## Actions (22)

| Group | Actions |
| --- | --- |
| Media | `media-list`, `media-get`, `media-update`, `media-delete`, `media-move`, `media-import-url`, `media-stats-get`, `media-stats-summary-get` |
| Folders | `folder-list`, `folder-get`, `folder-create`, `folder-update`, `folder-delete`, `subfolder-list` |
| Captions | `caption-list`, `caption-get` (JSON) |
| Account, tags, stats, jobs | `tag-list`, `account-get`, `account-usage-get`, `stats-account-get`, `stats-account-by-date`, `background-job-get` |

Things worth knowing:

- **Folders are what Wistia used to call projects.** The hashed ID is the same value.
- **Every request carries `X-Wistia-API-Version: 2026-09`**, which the spec marks required.
- **Lists are bare JSON arrays** with no total. List actions return `{items, count, nextCursor}`;
  `nextCursor` is the last row's `cursor` (present when cursor pagination is on) and goes into
  `cursorAfter`. Offset (`page`) and cursor pagination cannot be combined, and cursor pagination
  supports only `id` and `created` sorting. Wistia documents no default or maximum `per_page`.
- **Folder request bodies are camelCase** (`anonymousCanUpload`) while responses are snake_case.
- **`media-import-url` and `media-move` are asynchronous** and return a background job; poll it with
  `background-job-get`. Import without a folder creates a new "Untitled Folder".
- **`folder-delete` deletes the media inside the folder.** `media-delete` is recoverable from
  Recently Deleted until the account's restore window ends.
- `media-update` `tags` **replaces** all tags.

## Not yet covered

Left out because they were not needed for a first version, or an ambiguity in the spec could not be
resolved without a live token:

- Copy Media (`folder_id` is typed integer in the body schema but described as a folder ID while
  every other endpoint uses hashed IDs), Bulk Copy, Swap, Archive, Restore, Trim, Translate.
- Customizations (all sections), Brands, Channels and Channel Episodes, Speakers, Localizations,
  Extended Audio Descriptions, Custom Metadata, Folder Sharings, Folder copy, Subfolder
  create/update/delete, Bulk Tag, Tag create/delete, Expiring Tokens, Bulk Actions.
- Caption create/update/delete/edit/purchase and SRT/VTT/TXT downloads, Find Caption Matches.
- Stats events and visitor-level stats (`/stats/events`).
- The Upload API (`upload.wistia.com`, multipart) is a separate host and is not used; import by URL
  covers hosted files.
- The legacy `/v1` API.

## Icon

`assets/icon.png` is the vendor's own `https://wistia.com/apple-touch-icon.png` (PNG, 180 x 180,
4,409 bytes), saved verbatim.

## Health checks

- **`service`** (informational): reads `https://status.wistia.com/api/v2/components.json`. The page
  is real (`page.name` is "Wistia"; a nonsense sibling path is a 404) and is **Instatus**, not
  Statuspage, so states are `OPERATIONAL` / `DEGRADEDPERFORMANCE` / `PARTIALOUTAGE` /
  `MAJOROUTAGE` / `UNDERMAINTENANCE`. None of its 12 components is named API, so `App`, `Uploads`,
  `Encoding` and `Stats` stand in for it and decide the verdict; the others are reported but never
  move it. Because that mapping is inference, the severity is `informational`.
- **`auth:api-token`** (derived from the auth `test` hook): `GET /modern/account` as above.
- No quota check: `GET /modern/account_usage` reports plan limits, but only account owners and
  managers see them, so it cannot be a reliable probe. It is exposed as the `account-usage-get`
  action instead. Wistia publishes no rate-limit headers in the spec.
