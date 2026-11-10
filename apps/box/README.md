# Box

Upload, download, and manage files and folders in Box.

- **Categories** — storage
- **Auth methods** — oauth2
- **Actions** — 10
- **Triggers** — 20 (18 webhook, 2 poll)
- **Egress allowlist** — `api.box.com`, `upload.box.com`
- **Website** — https://www.box.com
- **API docs** — https://developer.box.com

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `file-uploaded` — File Uploaded | webhook (API-registered) | `FILE.UPLOADED` in a folder | file id, name, uploader, time |
| `activity` — Item Activity | webhook (API-registered) | **Any event** — Box webhook triggers you list (the `triggers` param is the registered subscription), on one file or folder | trigger name, item id/type/name, actor |
| `file-trashed` — File Trashed | webhook (API-registered) | `FILE.TRASHED` in a folder | file id, name, actor, time |
| `file-deleted` — File Deleted | webhook (API-registered) | `FILE.DELETED` in a folder | file id, name, actor, time |
| `file-restored` — File Restored | webhook (API-registered) | `FILE.RESTORED` in a folder | file id, name, actor, time |
| `file-moved` — File Moved | webhook (API-registered) | `FILE.MOVED` in a folder | file id, name, actor, time |
| `file-copied` — File Copied | webhook (API-registered) | `FILE.COPIED` in a folder | file id, name, actor, time |
| `file-renamed` — File Renamed | webhook (API-registered) | `FILE.RENAMED` in a folder | file id, name, actor, time |
| `folder-created` — Folder Created | webhook (API-registered) | `FOLDER.CREATED` in a folder | folder id, name, actor, time |
| `folder-renamed` — Folder Renamed | webhook (API-registered) | `FOLDER.RENAMED` in a folder | folder id, name, actor, time |
| `folder-moved` — Folder Moved | webhook (API-registered) | `FOLDER.MOVED` in a folder | folder id, name, actor, time |
| `folder-copied` — Folder Copied | webhook (API-registered) | `FOLDER.COPIED` in a folder | folder id, name, actor, time |
| `folder-trashed` — Folder Trashed | webhook (API-registered) | `FOLDER.TRASHED` in a folder | folder id, name, actor, time |
| `folder-deleted` — Folder Deleted | webhook (API-registered) | `FOLDER.DELETED` in a folder | folder id, name, actor, time |
| `folder-restored` — Folder Restored | webhook (API-registered) | `FOLDER.RESTORED` in a folder | folder id, name, actor, time |
| `shared-link-created` — Shared Link Created | webhook (API-registered) | `SHARED_LINK.CREATED` in a folder | item id, name, actor, time |
| `shared-link-updated` — Shared Link Updated | webhook (API-registered) | `SHARED_LINK.UPDATED` in a folder | item id, name, actor, time |
| `shared-link-deleted` — Shared Link Deleted | webhook (API-registered) | `SHARED_LINK.DELETED` in a folder | item id, name, actor, time |
| `new-folder-item` — New File or Folder in a Folder | poll (`list-folder-items`) | whole folder compared with the last check (up to 5000 items) | the new file, folder or web link |
| `new-or-updated-search-result` — New or Updated Search Result | poll (`search`, sorted `modified_at` descending) | a Box search you name | the new or modified match |

**Setup.** Subscribing creates a Box webhook (`POST /2.0/webhooks`) on the item you name, pointed at the trigger's callback URL, after removing any leftover webhook already pointed at that URL; unsubscribing deletes it. The Box app needs the **Manage webhooks** application scope, and the connected user needs access to the item. Then copy the app's **Primary Key** (and optionally **Secondary Key**) from Developer Console, your app, Configuration, Webhooks, into the trigger's `primaryKey` / `secondaryKey` params; Box signs every delivery with them and they cannot be read through the API.

**Trust model.** `BOX-SIGNATURE-PRIMARY` / `BOX-SIGNATURE-SECONDARY` must equal the base64 HMAC-SHA256 of the raw body followed by the `BOX-DELIVERY-TIMESTAMP` value under the matching key; either configured key is enough (so a key can be rotated), and the timestamp must be within ten minutes. A missing or empty primary key, a missing signature, a stale timestamp or a mismatch refuses the delivery.

Every named webhook trigger watches one **folder** and registers exactly one Box trigger; use `activity` for a file target or for several triggers at once, and for the Box triggers with no named key here (`FILE.DOWNLOADED`, `FILE.PREVIEWED`, `FILE.LOCKED`, `FILE.UNLOCKED`, `FOLDER.DOWNLOADED`, `COMMENT.*`, `COLLABORATION.*`, `METADATA_INSTANCE.*`, `TASK_ASSIGNMENT.*`, `SIGN_REQUEST.*`, `DOCGEN_*`, `WEBHOOK.DELETED`).

**Polls.** `new-folder-item` reads one folder with `GET /folders/{id}/items` (Box sorts folder items by type first, so there is no newest-first order to page by) and compares it with the last check; a folder over 5000 items fails the check with a clear error. `new-or-updated-search-result` runs `GET /search` sorted by `modified_at` descending; Box indexes new content with a delay.

Not covered: none of the list actions is skipped; `list-folder-items` backs `new-folder-item` and `search` backs `new-or-updated-search-result`.

Sources (verified 2026-11-10): https://developer.box.com/guides/webhooks/triggers/ , https://developer.box.com/guides/webhooks/v2/signatures-v2 , https://developer.box.com/reference/post-webhooks/ , https://developer.box.com/reference/get-folders-id-items/ , https://developer.box.com/reference/get-search/

## A note on the download redirect

`GET /files/{id}/content` (used by `download-file`) answers with a `302` to a
`dl*.boxcloud.com` host that varies per request — Box's own docs give
`dl.boxcloud.com` as the example and community reports show `dl2`/`dl3` in the
wild. That redirect is followed transparently by the single `fetch()` call the
host performs on this app's behalf; the runtime's egress allowlist only
inspects the request's own hostname (see `lib/client.ts`), so `*.boxcloud.com`
is neither declared in `w6w.network.allow` nor needed there.

## Downloads and uploads carry real file bytes

`download-file` reads the response bytes directly and hands them to the
host's file store via `ctx.file.create`, returning a `FileRef` rather than
inlining the content into the action's own JSON output — the bytes never
travel through step output at all.

`upload-file` accepts that `FileRef` (or its bare id) as its `content` param,
reads the bytes back out via `ctx.file.read`, and hand-builds its
`multipart/form-data` body from them as raw bytes (`attributes` part first,
then `file`, exactly as Box's docs require — the other order gets a `400
metadata_after_file_contents`). Content is no longer restricted to UTF-8
text: binary payloads survive the trip intact end to end.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left. Only the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.box.com>

```
GET https://status.box.com/api/v2/summary.json
```

Atlassian Statuspage — the same shape as `status.dropbox.com`. `status.indicator`
is `none` / `minor` / `major` / `critical`; `components` carries per-component
detail. Unauthenticated, CORS-enabled, cheap to poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

```
GET /2.0/users/me
```

Identifies the account (`id`, `name`, `login`), which also supplies the
connection label. Needs no particular scope beyond basic account access.

### Do we have quota left?

No headroom endpoint or response headers. Box answers `429` with `Retry-After`
and nothing else — no `X-RateLimit-Remaining`-style counter. (`/users/me` does
report *storage* quota via `space_amount`/`space_used`, but that's a different
question — "how much room is in the account" — from API throttling headroom,
so it isn't repurposed here.)

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.box.com` (for `service`) is reachable **only inside that
hook's worker** — not from any action, and not from the other checks. The spec
allows the widening precisely because the check is unsigned; pairing an extra
host with `credential: "signed"` is rejected at load time, so a credential can
never reach a status host.

**`quota` is declared absent.** Box publishes no rate-limit headroom endpoint
or response headers. A declared absence always reports `unknown`, so it
carries `severity: "informational"` — otherwise it would pin every verdict for
this app at `unknown` forever.

## OAuth notes

- Box's `/api/oauth2/authorize` does **not** accept a `scope` query parameter.
  Scopes are fixed once, on the app itself, in the Developer Console's
  "Application Scopes" section. `root_readwrite` (declared in
  `auth/oauth2.ts` for documentation) covers every action this app ships.
- PKCE is left off (`pkce: false`): Box's own without-SDK OAuth guide
  documents only the classic `client_secret` exchange and says nothing about
  `code_challenge`/`code_verifier`, so this app does not opt into it on
  spec.
- Refresh tokens rotate on every use (~60-day validity, one-time-use). No
  custom `refresh` hook is declared — the standard `grant_type=refresh_token`
  POST to `tokenUrl` is handled generically by the host, which must persist
  the rotated refresh token it gets back.

---

Researched and endpoint-verified 2026-08-01 against developer.box.com and
status.box.com. Status surfaces move; re-check if a probe starts failing for
everyone at once.
