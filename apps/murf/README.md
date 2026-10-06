# Murf

Synthesize speech, browse voices, manage cloned voices, re-voice audio, translate text and run
dubbing jobs and projects over the **Murf API** (`api.murf.ai`).

- **Categories** — ai, video
- **Auth methods** — `api-key` (two optional keys, both sent as the `api-key` header: the Speech key
  and the separate Murf Dub key; `sign` picks by path)
- **Actions** — 15
- **Health checks** — `service` (Murf's own Statuspage, the "API" component), `api` (unsigned
  reachability), `quota` (declared unavailable, informational) + the derived `auth:api-key`
- **Egress allowlist** — `api.murf.ai` (the status host `murf.statuspage.io` is allowlisted on the
  `service` check only)
- **API docs** — https://murf.ai/api/docs (OpenAPI: https://murf.ai/api/docs/openapi.json)
- **Icon** — the vendor's own mark from murf.ai's `<link rel=icon>` (256x256 PNG), saved verbatim

Verified on 2026-10-06 against the OpenAPI document, the dubbing guide and the changelog, plus
unsigned probes of `api.murf.ai`. No endpoint was called with a real key, so response shapes are
the documented ones, not sampled. No deprecation notice applies to what is built: the only
deprecations (Gen2 *streaming*, and the `multiNativeLocale` field superseded by `locale`) are
avoided.

## Things most likely to go wrong

1. **Dubbing uses a different API key.** The Murf Dub keys come from `dub.murf.ai/api/manage-keys`,
   not the speech dashboard; a speech key against `/v1/murfdub/*` is refused. The connection holds
   both, and `sign` chooses by URL path. Leave either empty if you only use one product.
2. **The refusal status varies by endpoint, so classify by `error_code`.** A missing key is `400` on
   `/v1/speech/*` but `403` on `/v1/murfdub/*`; a wrong key is `403` on voices and murfdub but `401`
   on `/v1/auth/token`. Every body is `{"error_message","error_code"}`. The credential test and the
   `api` check read that body.
3. **Multipart endpoints cannot go through a `FormData` object.** `ctx.fetch` stringifies a
   `FormData` body to `[object FormData]`. The URL-driven multipart actions (Convert Voice, both
   Create Dubbing Job actions) therefore build the multipart body as text, and send `file_url`
   rather than a binary `file`. `target_locales` is a repeated field, one part per locale, as
   Murf's own example does.
4. **Cloned voices only work with Falcon streaming**, not with Synthesize Speech; Murf documents
   this on List Cloned Voices. Gen2 voices are the ones List Voices returns by default.
5. **Audio URLs expire and synthesis spends characters.** Synthesize Speech returns
   `audioFile` (a temporary URL) or, with `encodeAsBase64`, the audio inline with no server
   retention. Transient dubbing links expire after 72 hours.
6. **`remainingCharacterCount` only comes back on a synthesis call**, so there is no free quota
   probe; `quota` is declared unavailable.
7. **`pitch`/`rate` are -50..50, `variation` 0..5**, and `voiceId` accepts the full id
   (`en-US-natalie`) or the bare actor name.

## Actions

| Area                 | Actions                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Speech               | `synthesize-speech`, `convert-voice`                                                                              |
| Voices               | `list-voices`, `list-cloned-voices`, `get-voice-clone-status`, `delete-cloned-voice`                              |
| Translation          | `translate-text`                                                                                                  |
| Dubbing languages    | `list-dubbing-source-languages`, `list-dubbing-destination-languages`                                             |
| Dubbing jobs         | `create-dubbing-job`, `create-dubbing-job-for-project`, `get-dubbing-job-status`                                  |
| Dubbing projects     | `create-dubbing-project`, `list-dubbing-projects`, `update-dubbing-project`                                       |

## Not covered

- `POST /v1/speech/stream` (HTTP streaming) and the WebSocket streaming channel: a streamed binary
  audio body and a socket session do not fit a request/response action.
- `POST /v1/speech/voices/create` (Create Voice Clone): requires an uploaded `audio` file; only a
  URL-driven multipart is possible here. `get-voice-clone-status` and `delete-cloned-voice` still
  work on clones created elsewhere.
- Uploading file bytes (`file`) to Convert Voice and the dubbing job endpoints: use `file_url`.
- `GET /v1/auth/token`: mints a short-lived token that would land in run records; the `api-key`
  header is used instead.
- The dubbing webhook payloads (`webhook_url` / `webhook_secret` can be set on a job, but this
  app declares no trigger to receive them).
- `update-dubbing-project` sends only `target_locales`, the documented body; Murf does not say
  whether it replaces or extends the list.
