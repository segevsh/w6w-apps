# Avoma

AI meeting assistant. This app reads Avoma's meetings, recordings, transcripts, AI notes,
insights, scorecards, users and smart categories, and can submit a call recording for analysis.

- App id: `io.w6w.avoma` · categories: `ai`, `productivity`, `analytics`
- Host: `api.avoma.com` (the only entry in `network.allow`) · API prefix `/v1`
- Source of truth: Avoma's OpenAPI document, `https://dev.avoma.com/openapi.yml` (43 paths,
  fetched 2026-10-06), plus unauthenticated live probes against `api.avoma.com` the same day.

## Auth

One method, `api-key` (type `bearer`): `Authorization: Bearer <key>`.

Avoma issues keys by hand. The docs point to the "Avoma API Integration guide"
(help.avoma.com/api-integration-for-avoma) or help@avoma.com, and the result is a Client Key and
Client Secret (the pair Zapier wants). The HTTP API itself takes a single bearer value; paste it
into the connection's **API Key** field. The key acts for the whole organization.

### The probe is `GET /v1/users/`

Chosen by what the body holds. It needs no query parameters (meetings, notes, calls and
transcriptions all **require** `from_date` and `to_date`), and it returns user-directory data
(`uuid`, `role`, `user.email`, ...) — nothing that echoes the caller's key. Verdicts come from the
body's `detail`; the status is only a hint. Measured 2026-10-06:

| Request | Status | Body |
|---|---|---|
| no `Authorization` header | 401 | `{"detail":"Auth missing in header and cookie"}` |
| `Bearer <garbage>` | 401 | `{"detail":"Invalid Token"}` |

"Auth missing" is reported as "the credential never reached the request" and "Invalid Token" as a
rejected key. The test hook builds the header by hand because only `sign` is auto-applied.
A **200 on `/v1/users/` with a real key was not observed** (no key was available); the success
path is from the spec (`200` array of users).

## Actions (19)

| Key | Type | Endpoint |
|---|---|---|
| `meeting-list` | search | `GET /v1/meetings/` |
| `meeting-get` | read | `GET /v1/meetings/{uuid}/` |
| `meeting-insights-get` | read | `GET /v1/meetings/{meeting_uuid}/insights/` |
| `meeting-segment-list` | read | `GET /v1/meeting_segments/?uuid=` |
| `meeting-sentiment-list` | read | `GET /v1/meeting_sentiments/?meeting_uuid=` |
| `meeting-drop` | perform | `POST /v1/meetings/{uuid}/drop/` |
| `transcription-list` | search | `GET /v1/transcriptions/` |
| `transcription-get` | read | `GET /v1/transcriptions/{uuid}/` |
| `recording-get` | read | `GET /v1/recordings/?meeting_uuid=` |
| `note-list` | search | `GET /v1/notes/` |
| `smart-category-list` | search | `GET /v1/smart_categories/` |
| `user-list` | search | `GET /v1/users/` |
| `user-get` | read | `GET /v1/users/{uuid}/` |
| `call-list` | search | `GET /v1/calls/` |
| `call-get` | read | `GET /v1/calls/{external_id}/` |
| `call-create` | perform | `POST /v1/calls/` |
| `scorecard-list` | search | `GET /v1/scorecards/` |
| `scorecard-get` | read | `GET /v1/scorecards/{uuid}/` |
| `scorecard-evaluation-list` | search | `GET /v1/scorecard_evaluations/` |

`meeting-drop` and `call-create` are `idempotent: false`: Avoma documents no idempotency key.

### Things that bite

1. **Date windows are mandatory.** `from_date` and `to_date` are required on meetings, notes, calls
   and transcriptions, although the meetings description says calling with no parameters returns
   everything. The actions refuse a missing window before sending. (`scorecard_evaluations` is the
   exception: its dates are optional.) Avoma also has a 60 s server timeout and 60 requests/min;
   a wide range can time out even when it looks small, so query in small windows.
2. **Paging is by `next` URL.** Only transcriptions and snippets document `page`. List actions
   return `{results, count, next, previous}` and take the previous `next` as the **Next page URL**
   param, followed verbatim but only on `https://api.avoma.com/v1/`. `GET /v1/users/` and
   `/v1/scorecards/` are documented as bare arrays and are folded into the same shape.
3. **Inconsistent parameter names.** Meeting segments use `uuid`; sentiments, recordings, notes and
   transcriptions use `meeting_uuid`; the notes prose says `meeting` but the parameter is
   `meeting_uuid`. Calls are addressed by the dialer's `external_id`, not an Avoma uuid.
4. **Recordings can answer 202.** It means still processing: no `audio_url` / `video_url`, just a
   `message`. The URLs expire at `valid_till`.
5. **Array filters repeat the key** (`user_emails=a&user_emails=b`, `scorecard_uuids`), while the
   CRM and attendee filters are documented as comma-separated strings.
6. **Trailing slashes are part of every path.**

## Health checks

| Check | Kind | Result |
|---|---|---|
| `auth:api-key` | derived | the auth `test` hook above |
| `api` | dependency, unsigned, app-scoped | `GET /v1/users/` with no credential. A 401 carrying Avoma's JSON `{"detail": ...}` **passes**: it proves the API and its auth layer answer. Non-JSON is `down`, 5xx is `down`. |
| `service` | declared absence (`informational`) | Avoma has no status page: `status.avoma.com` does not resolve and the docs link to none. |
| `quota` | declared absence (`informational`) | 60 requests/min is documented, but no rate-limit header appeared on the 401 responses sampled and no usage endpoint exists. Authenticated responses could not be sampled without a key. |

No `service` check is declared with a URL or provider.

## Not yet covered

Left out because the surface is large or the spec was not unambiguous:

- `GET /v1/snippets/` (response schema lives in an external file the document does not inline)
- `PATCH /v1/calls/{external_id}/` (request schema is an unresolved external reference)
- Meeting types and meeting outcomes (list/create/get/update/delete), templates (list/create/get/
  update), custom categories, smart-category create/update
- Engagement reports (`/v1/engagement/...`) and revenue intelligence (`/v1/revenue_intel/...`)
- Webhooks: subscription CRUD, signing-secret management and the event payload documents. These are
  a trigger concern, not an action.
- `call-create` omits `additional_details` (typed as a string, described as "a JSON object").

## Icon

`assets/icon.png` is the largest frame (48x48, 32-bit) of the vendor's favicon,
`https://dev.avoma.com/favicon.ico` (an ICO container, 15,086 bytes: 48, 32 and 16 px frames),
converted to PNG with no other change. Nothing was redrawn.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
