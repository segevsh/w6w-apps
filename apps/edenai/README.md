# Eden AI

Call LLMs, OCR, translation, speech, image and video models from many providers through one **Eden AI
V3** key: OpenAI-compatible chat/responses/embeddings/moderation, the Universal AI runner, async
jobs, files and the live feature catalogue.

- **Categories** — ai, developer-tools
- **Auth methods** — api-key (bearer)
- **Actions** — 30
- **Health checks** — `service` (Instatus status page), `quota` (declared unavailable, informational)
  plus the derived `auth:api-key`
- **Egress allowlist** — `api.edenai.run` (the `service` check adds `app-edenai.instatus.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.edenai.co/
- **API docs** — https://docs.edenai.co/ (index: https://docs.edenai.co/llms.txt)
- **Status page** — https://app-edenai.instatus.com/
- **Icon** — the vendor's 192x192 PNG, embedded verbatim as a base64 data URI in an SVG wrapper:
  https://cdn.prod.website-files.com/61e7d259b7746e2d1df0b68d/6a63231f527a49364ce64b6a_eden%20ai%20logo%20light.png

> Facts below were verified on 2026-10-06 against the vendor's OpenAPI document, docs and live
> probes of `api.edenai.run` and the status page.

## Findings that bite

1. **V3 is current; v2 is superseded.** Everything lives under `https://api.edenai.run/v3`. This app
   targets only V3.
2. **Three families, three `model` grammars.** LLM routes take `provider/model` (or a bare name for
   routing). Universal AI takes `feature/subfeature/provider[/model]` with the feature's fields
   nested under `input`. Gateway resources (`/upload`, `/info`, async jobs) take neither.
3. **A 200 can be a failure.** Universal AI answers `status: "fail"` inside a 2xx; the app throws on
   it. Async job reads return the failure instead, as `failed: true`, because polling is expected
   to observe it.
4. **Errors have two shapes.** 401/403 carry `{detail: "string"}`; 422 carries
   `{detail: [{loc, msg, type}]}`. The client renders both.
5. **Speech synthesis returns raw audio bytes**, with cost and provider only in the
   `x-edenai-cost` / `x-edenai-provider` headers. The action returns base64 audio.
6. **`GET /v3/models` is about 1.5 MB.** `models-list` slims and filters it (default limit 50).

## Auth probe

Public routes (`/info`, `/models`) answer without a key, so they prove nothing about a credential.
The probe is `GET /v3/universal-ai/async?limit=1`, an account-owned route that returns no
credential material. Classification follows the body: 403 `Not authenticated` means no key was
sent, `Invalid token` (or 401) means a rejected key, any other 403 is a refusal, 429 is
rate-limited, anything else is reported as an HTTP error without blaming the key.

## Health

- `service` reads `https://app-edenai.instatus.com/summary.json`, requires `page.name` to be
  `EdenAI`, and maps `UP` to ok, `HASISSUES`/`UNDERMAINTENANCE` to degraded, anything else to
  unknown. A broken status API is `unknown`, never `down`. An Atlassian Statuspage-looking page
  for the same name was examined and rejected as a decoy.
- `quota` is declared `unavailable` at `informational` severity: Eden AI exposes no
  credit-balance route to an API key.

## Actions

LLM and media: `chat-completion`, `response-create`, `embeddings-create`, `moderation-create`,
`models-list`, `image-generate`, `speech-create`, `video-create`, `video-get`, `video-list`,
`video-delete`.

Universal AI (sync): `universal-ai-run`, `translate-text`, `ocr-extract`, `entities-extract`,
`text-ai-detect`, `text-anonymize`, `resume-parse`, `web-search`, `web-scrape`.

Async: `ocr-multipage-start`, `speech-to-text-start`, `async-job-start`, `async-job-get`,
`async-job-list`, `async-job-delete`.

Files and discovery: `file-list`, `file-delete` (by ids only), `features-list`, `feature-get`.

## Not covered

- `POST /v3/upload` (multipart file upload) and delete-all-files
- Video content download
- Audio transcriptions (multipart)
- Image edits
- Anthropic-messages passthrough
- Decisions, collections and the Management API
- The EU host `api.eu.edenai.run` (single allowlisted host kept deliberately)
