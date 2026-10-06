# Runway

Generate video, images, speech and sound effects, poll the tasks to completion, run saved
workflows and Model Routers, and read credits and usage, over the **Runway developer API**
(`api.dev.runwayml.com`).

- **Categories** — ai, video
- **Auth methods** — api-key (`Authorization: Bearer key_...`)
- **Actions** — 29
- **Health checks** — `service` (status.runwayml.com, the "Public API" component), `api` (unsigned
  reachability), `quota` (credit balance) + the derived `auth:api-key`
- **Egress allowlist** — `api.dev.runwayml.com` (the status host `status.runwayml.com` is allowlisted
  on the `service` check only)
- **API docs** — https://docs.dev.runwayml.com (reference: `/api.md`, spec: `/openapi.json`)
- **Icon** — the vendor's own mark, taken from runwayml.com's `<link rel="icon">`
  (`https://runwayml.com/icon.png`), saved verbatim

Verified on 2026-10-06 against the OpenAPI 3.1 document and the guide pages, plus unsigned probes of
`api.dev.runwayml.com` and `status.runwayml.com`. No endpoint was called with a real key, so response
shapes are the documented ones, not sampled.

## Things most likely to go wrong

1. **Every request needs `X-Runway-Version: 2024-11-06`.** The OpenAPI declares it a `const` on every
   operation and the docs say a request without it fails. The client adds it; an app that calls the API by
   hand must too. The versioning policy supports an old version for four months after a new one ships.
2. **The create call is not the result.** Every generation answers `{ "id": "<uuid>" }`. Read the output
   with Get Task until `done` is true, no more often than every five seconds (the vendor does not refresh
   a task faster). Only `SUCCEEDED` carries `output`, and the URLs are temporary: download what you keep.
3. **Moderation is a FAILED task, not an HTTP error.** The create call answers 200; the task later reads
   `status: FAILED` with `failure` / `failureCode`. Moderated generations are still billed, and repeated
   ones can suspend the account. `THROTTLED` is not an error either: the task is queued behind the tier's
   concurrency limit and proceeds on its own.
4. **Request bodies are a union keyed on `model`.** Valid `ratio`, `duration`, prompt length and optional
   fields all change per model (for example `gen4.5` requires `ratio` and `duration`, `veo3.1` requires
   `ratio`, `seedance2_5` text-to-video requires only `model`), so never carry a value from one model to
   another. The generation actions take the common fields as typed params plus an `extra` JSON object that
   is merged into the body for anything else (typed params win over `extra`). Model ids are plain text on
   purpose: the vendor adds and retires them often (`gen3a_turbo` and `gen4_aleph` now fail outright).
5. **Auth errors have a string `error`.** A missing key is `401 {"error":"No API key was provided. …",
   "docUrl":…}` and a key not starting with `key_` is a 401 saying so. The credential test and the `api`
   health check read that body, never the status alone.
6. **Credit costs are not in this app.** The vendor publishes them only on its pricing page and says not to
   infer them; Get Organization / Query Credit Usage report what was actually spent.
7. **Workflows have their own id.** Run Workflow answers a workflow *invocation* id; read it with Get
   Workflow Invocation, not Get Task. A `SUCCEEDED` invocation can still have failed nodes (`nodeErrors`).

## Actions

| Area             | Actions                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Video            | `text-to-video`, `image-to-video`, `video-to-video`, `video-upscale`, `video-to-hdr`, `character-performance`        |
| Image            | `text-to-image`, `image-upscale`                                                                                    |
| Audio            | `text-to-speech`, `speech-to-speech`, `sound-effect`, `voice-dubbing`, `voice-isolation`                            |
| Tasks            | `get-task`, `cancel-task` (cancels a running task, deletes a finished one)                                          |
| Model routing    | `generate-video` (via a saved router, with dry run), `list-routers`, `get-router`                                    |
| Workflows        | `list-workflows`, `get-workflow`, `run-workflow`, `get-workflow-invocation`                                         |
| Account          | `get-organization`, `get-usage`                                                                                     |
| Uploads          | `create-upload`                                                                                                     |
| Characters/voice | `list-avatars`, `get-avatar`, `list-voices`, `get-voice`                                                            |

Media inputs accept an HTTPS URL, a `runway://` upload URI or a data URI (up to 5 MB). `list-*` actions
use cursor pagination (`limit` 1-100, `cursor` from `nextCursor`).

## Not covered

- **Uploading the file itself.** Create Upload returns the presigned form (`uploadUrl`, `fields`); the file
  must be POSTed there by the caller, and that storage host is not one this app calls. Use an HTTPS URL
  for inputs when you can.
- **Recipes** (`/v1/recipes/*`, seven prebuilt multi-step workflows) — each has its own body schema; not
  modelled yet. Pass them through a published workflow, or add them as separate actions.
- **Model Router create / update / delete / request log, routed image and audio generation**
  (`POST /v1/generate/image`, `/v1/generate/audio`) — only the list/get and video routing are built.
- **Characters writes** — create/update/delete avatar, conversations, avatar usage, avatar videos, realtime
  sessions, knowledge documents, create/update/delete/preview voice.
- **Linked-workspace usage and audit logs** (`/v1/organization/webapp/*`, Enterprise).
- **Waiting.** There is no blocking wait action: poll with Get Task (or a scheduler) at five-second-plus
  intervals.

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /v1/organization` (balance and tier, never
  the key). Passes only on a body with `creditBalance`; a 401 is a rejected secret.
- **service** — `status.runwayml.com`, an Atlassian Statuspage verified real (`page.id` `s9lfdrzmhryw`,
  name Runway). Five flat components (App, Backend, Billing, Support, **Public API**); only **Public
  API** (`w3jcq3dwljp4`) drives the verdict, the rest are reported as detail (on the day it was measured
  "App" was degraded while the API was fine). A broken status page is `unknown`, never `down`.
- **api** — unsigned `GET /v1/organization`; the documented 401 `error` envelope is a pass (it proves the
  application is answering), a 5xx is `down`, anything else is `unknown`.
- **quota** — `creditBalance` from the same endpoint: zero is `down`, under a tenth of the tier's
  `maxMonthlyCreditSpend` is `degraded`.
- Every check is live; none is declared unavailable.

## Deprecations

The reference was grepped for `deprecat|sunset|will be removed|end of life`: no API-level notice. The
versioning policy is a four-month support window for old `X-Runway-Version` values; `2024-11-06` is the
only value in the OpenAPI today. Models are retired individually (`gen3a_turbo`, `gen4_aleph`); the
actions never hard-code a model id, so a retirement cannot break them.
