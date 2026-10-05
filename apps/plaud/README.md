# Plaud

Register Plaud devices in the cloud registry, upload audio to Plaud storage, and transcribe it with
Plaud's speech models, on the **Plaud Dev API** ("Plaud Embedded").

- **Categories** — ai, productivity
- **Auth methods** — credentials (partner app client id + secret key, plus an optional API key)
- **Actions** — 7
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:credentials`
- **Egress allowlist** — `platform-us.plaud.ai`, `platform-jp.plaud.ai` (the `service` check adds
  `status.plaud.ai` to its own hook allowlist, never to the app's)
- **Website** — https://www.plaud.ai/
- **API docs** — https://docs.plaud.ai/ (index: https://docs.plaud.ai/llms.txt)
- **OpenAPI** — https://docs.plaud.ai/openapi/{auth,binding,file,transcription}.json
- **Status page** — https://status.plaud.ai/

> Verified 2026-10-05 against Plaud's four OpenAPI documents, its `llms-full.txt`, and live probes of
> the US and Japan hosts and `status.plaud.ai`. No authenticated call was made: no partner
> credential was available, so response shapes are the documented ones, not observed ones.

## What this API is, and is not

Plaud Embedded is for companies building their **own** product on Plaud hardware: a mobile app uses
the Embedded SDK to pair a recorder over Bluetooth and pull recordings, and server-side APIs handle
tokens, the device registry, file upload and transcription. This app wraps the server-side half.

| Actions | Endpoint family | Credential |
| --- | --- | --- |
| Bind / unbind / get binding state of a device | `/open/partner/sdk/*` | user token (Bearer) |
| Start / complete an audio upload | `/open/partner/files/upload/*` | user token (Bearer) |
| Submit / get a transcription | `/open/partner/ai/transcriptions/*` | `X-Client-Id` + `X-Client-Api-Key` |

**Not covered, and why**

- **Recording, Bluetooth pairing and listing a user's recordings.** Only the mobile SDK can do these.
  The device bind here is the *cloud* half; Plaud's docs say the on-device bind is a separate step.
  There is no REST endpoint to list or fetch recordings.
- **The S3 chunk PUTs of an upload.** `upload-presign` returns the presigned URLs and
  `upload-complete` merges the parts, but sending the bytes is left to the caller. The bucket host is
  not in the documents' declared servers, so it cannot be allowlisted without guessing. Plaud says the
  upload API is optional: the Transcription API accepts any public audio URL.
- **Plaud MCP and CLI.** These expose a *personal* Plaud account's recordings, summaries and notes
  after a person signs in. They are not a partner API and take no partner credential.
- **Europe and Singapore.** `data-retention` lists `platform-eu.plaud.ai` and `platform-sg.plaud.ai`
  as sales-gated, but neither resolves in DNS (checked 2026-10-05) and neither is in the OpenAPI
  `servers`. Only US and Japan are offered.
- **Minting a user token** as an action. The partner token it needs is a credential, so minting
  happens in the auth hooks, where the app renews the 24-hour user token itself.

## Findings worth knowing

1. **Three credentials, not two.** `client_id` + `secret_key` mint a partner token, which mints a
   per-user token (Bearer) for device and upload calls. The Transcription API instead takes a third
   secret, the app's **API key** (portal > App Settings > API Keys; Plaud states it is *not* the
   secret key) in `X-Client-Id` / `X-Client-Api-Key` headers. `sign` chooses the style from the
   request path, and refuses a transcription call on a connection that has no API key.
2. **The transcription response disagrees with itself.** The OpenAPI schema names the segment array
   `results` with `speaker_id`; the prose example shows `segments` with `speaker`. `transcription-get`
   reads either and returns `segments[].speaker`.
3. **`is_bind` is three-state.** `null` means signed but never bound, which is not the same as
   `false`. `bind_history` has one entry per bind event, so `device-binding-get` returns it
   de-duplicated plus the raw event count.
4. **Errors are three shapes.** The auth host answers 401 `{"detail":"CLIENT_NOT_FOUND"}`; partner
   endpoints answer `{"code","message"}`; an unknown serial number is a bare 404. Messages are built
   from the body, and a 200 carrying `detail` is still treated as a refusal.
5. **Transcription is gated on a device.** Plaud documents the Transcription API as unlocked only
   after a device has been bound through the Embedded SDK, and free ASR hours are metered. Transcripts
   are retained 7 days by default.

## Auth

One `custom` method, **Partner app credentials**. Fields: region (US or Japan), client id, secret key,
the stable **user id** the connection acts as (6 to 120 characters), and an optional transcription API
key. Connecting runs the partner-token exchange (HTTP Basic, form content type) and then mints the
user token; only the user token and the keys `sign` needs are stored, never the partner token. `refresh`
re-mints the user token (24 hours, renewed two minutes early).

`sign` stamps requests only to `platform-*.plaud.ai`; a request to any other host (such as an S3
presigned URL) is left untouched.

The credential check (`test`) re-mints a partner token and discards it. It does not exercise the API
key, since no documented endpoint can probe it without a task id.

## Health checks

- **`service`** — `status.plaud.ai` is an Instatus page titled "Plaud Developer": the developer
  platform, not the consumer app. `/summary.json` gives the page status (`UP`); components are under
  **`/v2/components.json`** (`/components.json` is a 404) and cover the Global Portal, SDK Service
  and ASR Service in US and JP. The check reads the page, maps component statuses, and treats an
  unreachable or mislabelled page as `unknown`, never `down`.
- **`quota`** — a declared absence (`informational`). Plaud meters transcription but exposes no
  endpoint or rate-limit header for the remaining allowance.
- **`auth:credentials`** — derived from the auth `test` hook.

## Actions

| Key | Type | What it does |
| --- | --- | --- |
| `device-bind` | perform | Cloud-registry bind of a device serial to the connection's user |
| `device-unbind` | perform | Remove that association |
| `device-binding-get` | read | Remote binding state and de-duplicated bind history |
| `upload-presign` | perform | Start a multipart upload, get presigned URLs per 5 MB chunk |
| `upload-complete` | perform | Merge uploaded parts, get a 24-hour download URL |
| `transcription-submit` | perform | Start an async transcription of a public audio URL |
| `transcription-get` | read | Status plus transcript, language, duration, segments |

The icon is the vendor's own wordmark, taken verbatim from the SVGs `docs.plaud.ai` serves
(`assets/logo/light.svg` and `dark.svg`).
