# Gladia

Transcribe audio and video with the **Gladia** speech-to-text API: start a pre-recorded job from a
URL, poll its result, list and delete jobs, register a remote file with Gladia, and list the
available models.

- **Categories** — ai, video
- **Auth methods** — `api-key` (`x-gladia-key` header)
- **Actions** — 6
- **Health checks** — `service` (status.gladia.io, `API` + `Pre-Recorded v2` components decide),
  `api` (unsigned reachability, passes on the documented 401 envelope), `quota` (declared
  unavailable, informational) + the derived `auth:api-key`
- **Egress allowlist** — `api.gladia.io` (the status host belongs to the `service` check only)
- **API docs** — https://docs.gladia.io/ (OpenAPI: https://api.gladia.io/openapi.json)
- **Icon** — the vendor's favicon, https://www.gladia.io/favicon.svg, saved byte-for-byte as
  `assets/icon.svg`

Verified on 2026-10-06 against the OpenAPI document, the docs index (`docs.gladia.io/llms.txt`) and
live probes of `api.gladia.io` and `status.gladia.io`.

## Actions

| Action | Endpoint |
| ------ | -------- |
| `transcription-start` | `POST /v2/pre-recorded` |
| `transcription-get` | `GET /v2/pre-recorded/{id}` |
| `transcription-list` | `GET /v2/pre-recorded` |
| `transcription-delete` | `DELETE /v2/pre-recorded/{id}` |
| `audio-upload-url` | `POST /v2/upload` (JSON `audio_url` form) |
| `model-list` | `GET /v1/models` (public) |

## Async flow

Transcription is asynchronous: `transcription-start` returns `{ id, result_url }` (HTTP 201) and the
job moves `queued` -> `processing` -> `done` | `error`. Poll `transcription-get` until `status` is
`done` (the text is at `result.transcription.full_transcript`), or set a **Callback URL** on start
so Gladia calls you when it finishes. Do not resubmit an accepted job.

## Things most likely to go wrong

1. **Two path families exist; one is deprecated.** The OpenAPI document still lists
   `/v2/transcription*` (identical schemas), but the docs mark every one of them "(Deprecated) Prefer
   the more specific pre-recorded endpoint". This app uses `/v2/pre-recorded*` only.
2. **A bad key and a missing key are both `401`.** Only the body differs
   (`"gladia user not found"` vs `"no gladia key provided"`), so the credential test classifies from
   the message. A `429` is treated as a recognised key. The `api` health check treats the documented
   401 envelope (`statusCode`, `message`, `request_id`) as a pass.
3. **`429` can mean concurrency or request rate.** Free accounts get 3 concurrent jobs and a one-time
   EUR 50 grant; paid accounts 25 concurrent plus 300 queued. No balance endpoint and no rate-limit
   headers exist, so the `quota` check is a declared absence. Audio limits: 135 minutes (4h15
   enterprise), 1000 MB, 2 channels.
4. **Model constraints.** `solaria-3` is pre-recorded only, supports EN/FR/DE/ES/IT, and takes
   exactly one language (no code switching); `solaria-1` is the default and covers 100+ languages.
5. **The `custom_metadata` list filter is not exposed**: the OpenAPI declares it as a bare object
   with no serialisation style, and its wire form is unverified. Array filters (`status`) repeat the
   key (`status=done&status=error`), the OpenAPI default.

## Not covered

- **Live / real-time transcription** (`/v2/live`, WebSocket) — needs a persistent socket, which
  `ctx.fetch` cannot hold.
- **Binary file upload** — `POST /v2/upload` also accepts `multipart/form-data`, but action params
  are JSON and cannot carry file bytes. Pass an audio **URL** (to Start Transcription directly, or
  via Upload Audio URL).
- **Audio download** (`GET /v2/pre-recorded/{id}/file`) — returns binary.
- **Deprecated** `/v2/transcription*` and `/v1/history` (lists live jobs too) endpoints.
- Webhooks (`transcription.created/success/error`) are inbound events, not callable endpoints.
