# Rendex

Screenshot, PDF and rendering API ([rendex.dev](https://rendex.dev)). Base URL
`https://api.rendex.dev/v1`; auth is `Authorization: Bearer rdx_...`. Built 2026-10-06 from the
[API reference](https://rendex.dev/docs/api-reference), [Watch API](https://rendex.dev/docs/watch)
and [error codes](https://rendex.dev/docs/errors) (no OpenAPI document exists) plus live probes.

## Actions (18)

| Action | Endpoint |
|---|---|
| `render-url`, `render-html`, `render-markdown` | `POST /v1/screenshot/json` |
| `render-link-create` | `POST /v1/render/link` |
| `content-extract` | `POST /v1/extract` |
| `artifact-create` | `POST /v1/artifact` |
| `batch-create` / `batch-get` / `job-get` | `POST /v1/screenshot/batch` / `GET /v1/batches/{id}` / `GET /v1/jobs/{id}` |
| `account-get` | `GET /v1/account` |
| `watch-create` / `watch-test` / `watch-list` / `watch-get` | `POST /v1/watches` / `POST /v1/watches/test` / `GET /v1/watches` / `GET /v1/watches/{id}` |
| `watch-runs-list` / `watch-run` / `watch-update` / `watch-delete` | `GET .../runs` / `POST .../run` / `PATCH` / `DELETE` |

Results are unwrapped from Rendex's `{success, data, meta}` envelope: `data` fields come back at
the top level with `meta` (request id, credit usage) beside them; an array `data` is `items`.

## Findings

- **Binary output is base64.** `POST /v1/screenshot` returns raw bytes, which a workflow cannot
  carry, so the render actions use its documented JSON twin `POST /v1/screenshot/json` and return
  `image` (base64) with `contentType`, size and timing. For a URL instead of bytes, use
  `render-link-create`.
- **Exactly one of `url`, `html`, `markdown`.** `data` (Mustache) is valid only with html or
  markdown, so `render-url` does not offer it.
- **Error code drift.** The docs list `INVALID_API_KEY`; the live API answers `INVALID_KEY` for a
  wrong key and `MISSING_API_KEY` for none (both 401). Both spellings are treated as a bad key.
- **Credits.** Every render, batch URL, artifact format and watch check spends credits and there
  is no idempotency key, so those actions are `idempotent: false`. Free-plan images are
  watermarked. Cookies, batch, webhooks and geo-targeting are plan-gated.
- **Watch responses are untyped here.** The docs show watch request bodies and the webhook
  payload but no sample response, so the watch actions return the body as sent. `watch-test`
  assumes the create body (docs: "dry-run a config before creating it").
- `watch-update` leaves blank fields unchanged, so it cannot send the `null` that switches off
  `webhookUrl` / `notifyEmail`.

## Health checks

- **`service`** — unauthenticated `GET https://api.rendex.dev/health` (documented; live:
  `{"status":"ok","product":"rendex","version":"1.8.0"}`). Verdict from the body: `product`
  must be `rendex`; `status: ok` is ok, another status degraded, 5xx down, anything else
  unknown. `rendex.dev/status` is a real page but has no feed or JSON: every candidate path
  (`/status.json`, `/api/status`, `/api/v1/status`, `/status/feed.xml`) answers the same 200 HTML
  shell, so it is not parsed.
- **`quota`** — signed `GET /v1/account`: `usage.used` against `usage.limit`; 90% is degraded,
  100% down, unlimited plans and non-positive limits are ok.
- **`auth:api-key`** — derived from the auth `test`: `GET /v1/account` (free, no credit, no
  credential in the body), classified from `error.code`.

## Not covered

`POST/GET /v1/screenshot` (raw bytes), `GET /v1/render` and `GET /v1/images/*` (binary, served
from the signed URLs the API returns), single `async: true` captures and the `hosted` /
`extract` flags on the JSON endpoint (response shapes not documented), custom storage, webhook
signature verification, and the MCP server.

## Icon

`assets/icon.svg` wraps the vendor's own PNG mark (`https://rendex.dev/apple-icon`, 180×180).
The vendor's `icon.svg` draws its "R" with a font-dependent `<text>` element, so it is not used.
