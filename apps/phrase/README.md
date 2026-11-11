# Phrase Strings

Software localization (formerly PhraseApp) as a w6w app: projects, locales, translation keys,
translations, file uploads and downloads, and jobs, over the Phrase Strings API v2. Scope is
**Phrase Strings only** — Phrase TMS is a separate product and API.

- App id `io.w6w.phrase` · auth: access token (`Authorization: token <t>`) + data centre
- Hosts: `api.phrase.com` (EU) and `api.us.app.phrase.com` (US)
- Icon: Phrase's own favicon, `https://phrase.com/wp-content/uploads/2023/09/cropped-phrase-favicon-192x192.png`
  (PNG, 192px), embedded verbatim as a base64 data URI in an SVG wrapper.
- **Triggers** — 11 (poll)

## Verified against

Phrase's compiled OpenAPI document (`https://raw.githubusercontent.com/phrase/openapi/main/doc/compiled.json`,
v2.0.0, 184 paths) and `developers.phrase.com/en/api/strings/{authentication,pagination,rate-limiting}`,
checked 2026-10-06, plus live probes of both hosts and of `status.phrase.com`. Every path, verb,
query/body field and enum above comes from that document. A grep of the document for
`deprecat|sunset|will be removed|end of life` found only deprecated *parameters* (the download
`tag` option, superseded by `tags`; the obsolete upload `convert_emoji`); this app uses neither,
and v2 is the one current API version.

## Auth and regions

Create an access token under Profile settings > Access tokens (or via the Authorizations API) and
paste it with the data centre your account lives in (`eu.phrase.com` or `us.phrase.com`). A token
only works on the data centre that minted it. `afterConnect` publishes the region on the
connection so every action reaches the right host without ever seeing the credential.

The header form is the only one used. Phrase also accepts HTTP Basic and an `?access_token=` query
parameter; the latter would put the token in logged URLs. Two-factor-protected user accounts need
an `X-PhraseApp-OTP` header on some calls; use a token without that requirement — OTP is not
modelled.

**User-Agent.** The compiled spec and the Authentication page do not document a User-Agent
requirement, and an unauthenticated request with an empty UA returned the same 401 as one with a
UA, so the requirement could not be confirmed either way. The client sends
`w6w-phrase-app/0.1` regardless.

## Actions (32)

| Key | Type | Title | Endpoint |
|---|---|---|---|
| `user-get` | read | Get Current User | `GET /v2/user` |
| `account-list` | search | List Accounts | `GET /v2/accounts` |
| `project-list` | search | List Projects | `GET /v2/projects` |
| `project-get` | read | Get Project | `GET /v2/projects/{projectId}` |
| `project-create` | perform | Create Project | `POST /v2/projects` |
| `project-update` | perform | Update Project | `PATCH /v2/projects/{projectId}` |
| `locale-list` | search | List Locales | `GET /v2/projects/{projectId}/locales` |
| `locale-get` | read | Get Locale | `GET /v2/projects/{projectId}/locales/{localeId}` |
| `locale-create` | perform | Create Locale | `POST /v2/projects/{projectId}/locales` |
| `locale-download` | read | Download Locale | `GET /v2/projects/{projectId}/locales/{localeId}/download` |
| `key-list` | search | List Keys | `GET /v2/projects/{projectId}/keys` |
| `key-get` | read | Get Key | `GET /v2/projects/{projectId}/keys/{keyId}` |
| `key-create` | perform | Create Key | `POST /v2/projects/{projectId}/keys` |
| `key-update` | perform | Update Key | `PATCH /v2/projects/{projectId}/keys/{keyId}` |
| `key-delete` | perform | Delete Key | `DELETE /v2/projects/{projectId}/keys/{keyId}` |
| `key-search` | search | Search Keys | `POST /v2/projects/{projectId}/keys/search` |
| `keys-tag` | perform | Tag Keys | `PATCH /v2/projects/{projectId}/keys/tag` |
| `translation-list` | search | List Translations | `GET /v2/projects/{projectId}/translations` |
| `translation-get` | read | Get Translation | `GET /v2/projects/{projectId}/translations/{translationId}` |
| `translation-create` | perform | Create Translation | `POST /v2/projects/{projectId}/translations` |
| `translation-update` | perform | Update Translation | `PATCH /v2/projects/{projectId}/translations/{translationId}` |
| `translation-verify` | perform | Verify Translation | `PATCH /v2/projects/{projectId}/translations/{translationId}/verify` |
| `upload-create` | perform | Upload File | `POST /v2/projects/{projectId}/uploads` |
| `upload-list` | search | List Uploads | `GET /v2/projects/{projectId}/uploads` |
| `upload-get` | read | Get Upload | `GET /v2/projects/{projectId}/uploads/{uploadId}` |
| `job-list` | search | List Jobs | `GET /v2/projects/{projectId}/jobs` |
| `job-get` | read | Get Job | `GET /v2/projects/{projectId}/jobs/{jobId}` |
| `job-create` | perform | Create Job | `POST /v2/projects/{projectId}/jobs` |
| `job-start` | perform | Start Job | `POST /v2/projects/{projectId}/jobs/{jobId}/start` |
| `job-complete` | perform | Complete Job | `POST /v2/projects/{projectId}/jobs/{jobId}/complete` |
| `tag-list` | search | List Tags | `GET /v2/projects/{projectId}/tags` |
| `format-list` | search | List Formats | `GET /v2/formats` |

List actions return `{ items, page, perPage, totalCount, totalPages, nextPage }`; `nextPage` is
absent on the last page. Phrase returns a bare array and reports position in the `Pagination`
header (falling back to the `Link` header's `rel="next"`). `perPage` defaults to 25, max 100.

Creates (`project-create`, `locale-create`, `key-create`, `translation-create`, `job-create`,
`upload-create`) are marked non-idempotent: Phrase accepts no idempotency key.
`upload-create` is asynchronous — poll `upload-get` until `state` leaves `processing`.
`upload-create` sends **text** content only; binary formats (xlsx, etc.) are not supported.
`locale-download` returns the file as text with its content type and ETag.

## Health checks

- **`service`** — `status.phrase.com` (`GET /api/v2/summary.json`). Verified real: an Atlassian
  Statuspage, `page.id` `1h2gj9cpnbtp`, served directly with no redirect. The page rolls up
  Strings, TMS, Orchestrator, Portal, IDM and Language AI, each EU and US, so the top-level
  indicator says nothing about this app. The verdict is the `API` component of the connection's own
  "Phrase Strings (EU|US)" group (`81swzdq8nq9p` / `m0yjp8hx3jkd`); the group's other components
  (Translation center, Repo sync, OTA, Ordering, In-context editor, Email delivery) are listed but
  can only degrade. A different `page.id` reports `unknown`.
- **`quota`** — `GET /v2/user` read for `X-Rate-Limit-{Limit,Remaining,Reset}` (documented limit:
  1000 requests / 5 minutes, 4 concurrent). Informational.
- **`auth:access-token`** (derived) — `GET /v2/user`. The response is
  `{id, username, name, email, position, language, created_at, updated_at}` — no credential
  material, so it is safe to store, unlike a whoami that echoes a key. A pass requires that JSON
  shape, not just a 2xx.

## Findings worth knowing

1. A bad or missing token gets an **empty `text/html` 401** on both hosts, not a JSON error, so
   there is no vendor error code to classify; only the status carries the signal. Other errors
   (400/404/422) are `{message, errors:[{resource, field, message}]}`.
2. **A token is bound to one data centre**; the wrong host rejects it exactly as a bad token does
   (same empty 401), which makes a wrong region look like a wrong token.
3. Lists are bare arrays — the page position is only in the `Pagination`/`Link` headers — and the
   rate limit is **per user**, 1000/5 min **and 4 concurrent**, so parallel workflow branches hit
   the concurrency limit (429, `X-Rate-Limit-Reason: global-concurrency`) long before the window.
4. Job create takes `tags`, `translation_key_ids` and `target_locale_ids` as JSON arrays, while key
   create/update, upload, download and bulk tag take `tags` as a comma-separated string.

## Not covered

Documents, glossaries and terms, style guides, screenshots and markers, orders, branches (the
`branch` parameter is accepted on every branch-aware action, but branch create/merge/compare are
not exposed), webhooks and deliveries, releases/distributions (OTA), automations, repo syncs,
spaces and teams, members and invitations, comments, custom metadata, variables, quality
scores, machine-translation settings, collection-wide key/translation operations, the async
`locale_download` export, and upload batches. These are left out to keep the surface focused,
not because they are unavailable.


## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-job` — New Job | Poll | `job-list` | Each job created since the previous check, in the chosen project |
| `new-or-updated-job` — New or Updated Job | Poll | `job-list` | Each job created or edited since the previous check (the id carries `updated_at`) |
| `new-key` — New Key | Poll, newest-first (`sort=created_at&order=desc`) | `key-list` (also delivers `key-search` records) | Each key created in the chosen project |
| `new-or-updated-key` — New or Updated Key | Poll, newest-first (`updated_at` desc) | `key-list` | Each key created or edited (the id carries `updated_at`) |
| `new-translation` — New Translation | Poll, newest-first (`created_at` desc) | `translation-list` | Each translation created in the chosen project |
| `new-or-updated-translation` — New or Updated Translation | Poll, newest-first (`updated_at` desc) | `translation-list` | Each translation created or edited |
| `new-project` — New Project | Poll, snapshot | `project-list` | Each project that newly becomes visible |
| `new-or-updated-project` — New or Updated Project | Poll, newest-first (`sort_by=updated_at_desc`) | `project-list` | Each project created or edited |
| `new-account` — New Account | Poll, snapshot | `account-list` | Each account (organization) the token newly sees |
| `new-locale` — New Locale | Poll, snapshot | `locale-list` | Each locale added to the chosen project |
| `new-tag` — New Tag | Poll, snapshot (keyed by tag name) | `tag-list` | Each tag created in the chosen project |

Pick the **Project ID** in the trigger's settings. Phrase documents `updated_since` on `GET /projects/{project_id}/jobs` but no sort order, so both triggers call the existing `job-list` action with `updated_since` set to the previous check minus a 10-minute overlap and de-duplicate by id; `new-job` also requires `created_at` inside the window, so an edited old job is not reported as new. The first check records the current window without emitting events.

Snapshot triggers read up to 5 pages of 100 and diff the ids; a longer list fails with a clear error. `key-list` and `key-search` return the same key records, so `new-key` covers both.

Not covered: `format-list` (static reference data: the file formats Phrase supports) and `upload-list` (the uploads list documents only `branch`, `page` and `per_page`: no sort and no since filter, and it grows without bound).

Vendor docs for the triggers above (verified 2026-11-10): [keys](https://developers.phrase.com/en/api/strings/keys/list-keys), [translations](https://developers.phrase.com/en/api/strings/translations/list-translations), [projects](https://developers.phrase.com/en/api/strings/projects/list-projects), [accounts](https://developers.phrase.com/en/api/strings/accounts/list-accounts), [locales](https://developers.phrase.com/en/api/strings/locales/list-locales), [tags](https://developers.phrase.com/en/api/strings/tags/list-tags).

Source: [`GET /projects/{project_id}/jobs`](https://developers.phrase.com/en/api/strings/jobs/list-jobs) and the compiled OpenAPI [`doc/compiled.json`](https://github.com/phrase/openapi/blob/master/doc/compiled.json) (parameter `updated_since`; verified 2026-11-10).
