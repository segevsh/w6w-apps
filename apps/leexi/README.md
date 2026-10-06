# Leexi

Read Leexi calls, transcripts and AI summaries, import recordings, manage meeting events and the
Leexi meeting assistant, and administer users and teams (plus the reseller endpoints), over the
**Leexi public API** (v1).

- **Categories** — ai, productivity, video
- **Auth methods** — `basic` (API Key ID + Key Secret, HTTP Basic)
- **Actions** — 39
- **Health checks** — `service` (status.leexi.ai, Better Stack, `api.leexi.ai` resource decides),
  `api` (unsigned reachability), `quota` (declared unavailable, informational) + the derived
  `auth:basic`
- **Egress allowlist** — `public-api.leexi.ai` (the status host belongs to the `service` check only)
- **API docs** — https://developer.leexi.ai/ (per-endpoint OpenAPI at
  https://docs.public-api.leexi.ai/llms.txt; there is no standalone openapi.json)
- **Icon** — the vendor's favicon, https://www.leexi.ai/favicon.ico, saved byte-for-byte as
  `assets/icon.png` (the file served as `.ico` is actually a 221x206 PNG)

Everything here was verified on 2026-10-06 against the OpenAPI block on each reference page and
live probes of `public-api.leexi.ai` and `status.leexi.ai`.

## Things most likely to go wrong

1. **Errors are mostly empty.** An unauthenticated `GET /v1/users` and one with a bogus Basic pair
   both answer `401` with an **empty `text/html` body**, and an unknown path answers `404` the same
   way. There is no vendor error code to read, so the credential test classifies by the documented
   status: `401` key missing/invalid, `403` genuine key without that endpoint's scope (counts as a
   live credential, which is what a reseller key gets on `/calls`), `402` inactive subscription.
2. **Permission scopes are per key.** A new key only gets `read_calls`; users, teams, meeting events
   and call writes each need their own scope (`write_users` and `write_teams` change billed
   licenses). A key can also be scoped to a subset of calls: calls outside it are 404, not 403.
   Reseller keys (`read_clients`/`write_clients`) cannot call the regular endpoints and vice versa.
3. **Array filters are Rails-style** — `source_id[]=a&source_id[]=b`, not comma lists. This app
   encodes them that way. Lists page with `page`/`items` (1-100, default 10) and return
   `pagination.pages`; a page past the end is an empty `data` array, not an error.
4. **Importing a call is three steps, and one is not here.** *Request Recording Upload* returns a
   presigned S3 URL; the file must be `PUT` to it (single part, with the returned headers) by you,
   within 3 days; then *Create Call* takes the `recording_s3_key`. The PUT goes to an S3 host this
   app does not allow (sandbox egress is `public-api.leexi.ai` only), so it is deliberately not an
   action. Create Call is asynchronous (a few minutes) and its answer is only an acknowledgement;
   prompt completions (summaries) arrive after the call exists. Rate limit 50 requests/minute,
   10/minute for call creation.
5. **List vs Get.** `call-list` omits the transcript and call topics; `call-get` adds both (word
   level `transcript` plus `simple_transcript`). `with_simple_transcript` on the list returns the
   paragraph transcript as a string per call.
6. **`from`/`to` are documented as filtering `created_at`** on the call list, but the `date_filter`
   parameter switches them to `performed_at` or `updated_at`.
7. **Deprecated fields are not exposed:** Create Call's `emails` and `raw_phone_number` (they cannot
   be combined with `customers`/`participating_user_uuids`) and the `customer_email_addresses` /
   `customer_phone_numbers` response fields (use `customers`). No whole endpoint is deprecated.

## Actions

| Area | Actions |
| ---- | ------- |
| Calls | `call-list`, `call-get`, `call-create`, `call-presign-recording` |
| Call notes | `call-note-list`, `call-note-get`, `call-note-update`, `call-note-delete` |
| Meeting events | `meeting-event-list`, `meeting-event-get`, `meeting-event-create`, `meeting-event-delete`, `meeting-event-launch-bot` |
| Users | `user-list`, `user-get`, `user-create`, `user-update`, `user-deactivate` |
| Teams | `team-list`, `team-get`, `team-create`, `team-update`, `team-delete` |
| Reseller companies | `client-company-list`, `client-company-create`, `client-company-update`, `client-company-deactivate`, `client-subscription-start`, `client-subscription-cancel` |
| Reseller teams | `client-team-list`, `client-team-get`, `client-team-create`, `client-team-update`, `client-team-delete` |
| Reseller users | `client-user-list`, `client-user-get`, `client-user-create`, `client-user-update`, `client-user-deactivate` |

Every action returns Leexi's envelope as `{ data, message }` (lists: `{ data, pagination }`).

## Not covered

- **Webhooks** (`call.processed`) are events Leexi sends to you, not callable endpoints.
- **The recording upload** itself (see item 4).
- Role names for users are free text; the reference does not enumerate them.

## Health checks

- **`service`** — `status.leexi.ai` is a real Better Stack page (`/index.json`, page id `194848`,
  `company_name` "Leexi"). Statuspage-shaped paths on that host are a catch-all HTML page and
  `leexi.statuspage.io` is an unclaimed decoy. Two resources: `leexi.ai` (web app, capped at
  degraded) and `api.leexi.ai` (decides).
- **`api`** — unsigned `GET /v1/users`; the empty `401` is a pass (route exists, auth enforced),
  `404` is not.
- **`quota`** — declared unavailable at informational severity: 50 requests/minute is documented but
  no rate-limit header or usage endpoint exists.
- **`auth:basic`** — derived from the credential test: `GET /calls?items=1` (the one route a default
  key can read; the body is discarded).
