# HTML/CSS to Image

Render HTML/CSS, public web pages and saved templates to images (PNG, JPG, WebP) or PDF with
**HTML/CSS to Image** (`hcti.io`), and manage the images and templates an account has made.

- **Categories** — developer-tools, marketing
- **Auth methods** — basic (API ID + API Key)
- **Actions** — 12
- **Health checks** — 2 (`service`, ~~`quota`~~) plus 1 derived `auth:basic`
- **Network** — `hcti.io`

Built from the vendor's OpenAPI 3.1 document (`https://htmlcsstoimage.com/openapi/v1.json`, 22 paths, 39 operations) and `docs.htmlcsstoimage.com`, verified 2026-10-06.

## Auth setup

1. In the HTML/CSS to Image dashboard open **API keys**. Every organization has a default key; make
   a narrower one if you like.
2. Connect with the **API ID** (the username) and the **API Key** (the password). They are sent as
   `Authorization: Basic base64(api-id:api-key)`, stamped by the auth `sign` hook only.

Keys carry permissions. A key without the permission a route needs gets `403`, and the error names
it:

| Actions | Permission |
|---|---|
| `image-create-*` | `images:create` |
| `image-get`, `image-list` | `images:read` |
| `image-delete` | `images:delete` |
| `template-list`, `template-versions-list` | `templates:read` |
| `template-create`, `template-version-create` | `templates:create_update` |
| `template-delete` | `templates:delete` |
| `usage-get` | `usage:read` |

The connection test calls `GET /v1/usage` (no credits spent, no credential in the response). A `403`
there still passes — the key is real, merely scoped away from `usage:read`. `POST /v1/image` is
never used as a probe, because it spends image credits.

## Actions

| Action | Route |
|---|---|
| `image-create-html` | `POST /v1/image` with `html`/`css` |
| `image-create-url` | `POST /v1/image` with `url` |
| `image-create-template` | `POST /v1/image/{template_id}[/{version}]` |
| `image-get` | `GET /v1/images/{id}` (metadata) |
| `image-list` | `GET /v1/images` (cursor: `page_token`) |
| `image-delete` | `DELETE /v1/image/{id}` (202, queued) |
| `template-create` | `POST /v1/template` |
| `template-version-create` | `POST /v1/template/{id}` |
| `template-list` | `GET /v1/template` |
| `template-versions-list` | `GET /v1/template/{id}` |
| `template-delete` | `DELETE /v1/template/{id}` |
| `usage-get` | `GET /v1/usage` |

Param keys on the creation actions are the vendor's own snake_case field names
(`device_scale`, `viewport_width`, `dedupe_duration_s`, …).

## Things that cost a day

- **The OpenAPI file cannot express a templated image.** Its `Templated Image Request` has
  `template_values` and no `template_id`. The documented route is `POST /v1/image/{template_id}`
  (latest) or `/{template_id}/{template_version}` (pinned); `image-create-template` uses it.
- **Creation is not retry-safe.** Every render spends credits and there is no idempotency key; the
  vendor's guard is `dedupe_duration_s` (identical request within N seconds returns the existing
  image; plan-dependent). Creation actions are marked `idempotent: false`.
- **`/v1/image/{id}` and `/v1/images/{id}` are different routes.** The singular one renders image
  bytes (and is where `DELETE` lives); the plural one returns JSON metadata.
- **Reading one template means listing its versions** (`GET /v1/template/{id}` is
  `list-template-versions`), and template list pagination passes `next_page_start` back as
  `max_version`, not as a cursor token.
- **Errors are `{success:false, error, message, statusCode, validationErrors:[{path,message}]}`** —
  a bare `401` has `message: "Missing Authorization"` (no header) or `"API Key is Invalid"`.
  A bare curl also gets `403` from the OpenAPI document host without a browser User-Agent.

## Health checks

- **`service`** — `https://status.htmlcsstoimage.com/api/v2/summary.json`, an Atlassian Statuspage
  (`page.id` `fzhv08zhzp1g`, name "HTML/CSS to Image API", pinned by id). The `API` component
  (described "HTML/CSS to Image API. https://hcti.io") decides the verdict; `Website` (marketing
  site and dashboard) is named in the message but never moves it. Falls back to the page-level
  indicator if the `API` component disappears. The status host is allowlisted on the check only,
  not in `network.allow`.
- **`quota`** — declared unavailable, `informational`. `GET /v1/usage` returns consumption but no
  plan ceiling, there is no headroom header, and image creation has no rate limit; out-of-credit
  shows up only as a `402` on creation.
- **`auth:basic`** — derived from the auth `test` hook (above).

## Not yet covered

Batch creation (`POST /v1/image/batch`, `…/batch/templated`, `DELETE /v1/image/batch`), the
create-and-render signed GET URL, `GET /v1/image/{id}[.format]` rendering/cropping (returns bytes),
`PUT /v1/store/{id}`, OG configs, proxies, storage destinations and API-key management. The first
two groups return or need binary or signed-URL handling; the management groups are infrastructure,
not rendering, and have their own per-minute limits.

## Icon

`assets/icon.svg` is the vendor's own mark, byte-for-byte from
`https://docs.htmlcsstoimage.com/assets/images/hcti-logo.svg` (SVG 225×225, 4,424 bytes).
