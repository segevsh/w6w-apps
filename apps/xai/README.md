# Grok by xAI (`io.w6w.xai`)

Grok chat, Responses and Messages calls, embeddings, image generation, tokenization, model
listing and file management through the xAI API (`https://api.x.ai`).

## Auth

One method, `api-key` (`bearer`). Create a key at <https://console.x.ai> (API Keys) and paste it;
every request signs with `Authorization: Bearer <key>`. `test` probes `GET /v1/models`.
`GET /v1/api-key` is deliberately not used: it describes the key itself.

The credential check classifies the reply **body**, not the status. Measured on 2026-10-06: no
credential gives `401 {"code":"unauthenticated:no-credentials"}`, but a wrong key gives
**`400 {"code":"invalid-argument","error":"Incorrect API key provided..."}`**.

## Actions (14)

| Key | Endpoint |
|---|---|
| `chat-complete` | `POST /v1/chat/completions` |
| `create-response` | `POST /v1/responses` |
| `get-response` | `GET /v1/responses/{id}` |
| `delete-response` | `DELETE /v1/responses/{id}` |
| `create-message` | `POST /v1/messages` (Anthropic-compatible) |
| `create-embedding` | `POST /v1/embeddings` |
| `generate-image` | `POST /v1/images/generations` |
| `tokenize-text` | `POST /v1/tokenize-text` |
| `list-models` | `GET /v1/models` |
| `get-model` | `GET /v1/models/{id}` |
| `list-language-models` | `GET /v1/language-models` |
| `list-files` | `GET /v1/files` (`pagination_token`) |
| `get-file` | `GET /v1/files/{id}` |
| `delete-file` | `DELETE /v1/files/{id}` |

Source of truth: `https://docs.x.ai/openapi.json` (38 paths), checked 2026-10-06. Model ids are
never hardcoded; take them from `list-models`.

## Not yet covered

Streaming (`stream: true`), legacy `/v1/complete` and `/v1/completions`, `documents/search`,
file upload (`multipart/form-data`) and file content download (raw bytes), file public URLs,
`images/edits`, video generation/edit/extension and deferred completions (async `request_id`
polling), `responses/compact`, `responses/{id}/input_items`, embedding/image/video model
listings, skills, and `/v1/me`.

`create-embedding` sends `input` as an array of strings, the shape of the vendor's own request
example. The OpenAPI schema for `EmbeddingInput` describes tagged wrapper objects instead
(`{"String": ...}`), which contradicts that example, so token-id inputs are left out.

## Icon

`assets/icon.png` is the real xAI mark from <https://x.ai/icon.png> (PNG 512x512, 15,940 bytes).
simple-icons' `x` is Twitter's mark and is not used.

## Health checks

- **`service`** reads the RSS incident feed at `https://status.x.ai/feed.xml` (`SpaceXAI System
  Status`). The status page itself is custom (not Statuspage/Instatus) and answers 403 to a bare
  fetch; there is no JSON summary, so the feed is the only machine-readable surface. Each incident
  is emitted once per affected component, with a bracketed title prefix. Only `[Global
  (api.x.ai)]` and `[US (us.api.x.ai)]` are treated as the API; `grok.com`, app and voice
  components are ignored. Open means the body lacks `Status: RESOLVED`; an open `Severity: outage`
  is `down`, anything else `degraded`. The feed host is allowlisted implicitly, so `network.allow`
  stays `api.x.ai` only.
- **`quota`** is a declared absence (`severity: informational`): the OpenAPI document declares no
  rate-limit header, usage or balance endpoint.
- `auth:api-key` is derived from the `test` hook.
