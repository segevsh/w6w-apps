# QuickChart

Render charts, QR codes, barcodes, word clouds, tables, Graphviz diagrams and watermarked images as
images, and save a chart to a short URL, on **QuickChart** (`quickchart.io`).

- **Categories** — analytics, developer-tools, documents
- **Auth methods** — api-key (optional: every action also runs with no connection)
- **Actions** — 13
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `quickchart.io`
- **Website** — https://quickchart.io/
- **API docs** — https://quickchart.io/documentation/ · OpenAPI https://quickchart.io/openapi.json
- **Status page** — `quickchart.statuspage.io` exists but has not been updated since 2020-11-07, so it
  is not used; `service` probes `GET /healthcheck` instead

> **Verified 2026-10-06** against the vendor's OpenAPI document (`/openapi.json`) and docs site,
> plus live calls to every route used. Icon is the vendor's own mark
> (`quickchart.io/images/bar_chart_logo.svg`), verbatim.

## Actions

| Key | Route | Returns |
|---|---|---|
| `chart-render` | `POST /chart` | image file (PNG/JPEG/WebP/SVG/PDF) |
| `chart-url-create` | `POST /chart/create` | short URL + interactive viewer URL |
| `chart-validate` | `POST /api/validate-chart` | `valid`, `errors`, `warnings` |
| `chart-draft-from-text` | `POST /natural/config` | Chart.js config string + saved image URL |
| `qr-render` | `POST /qr` | image file |
| `qr-url-build` | `POST /qr-url` | a `quickchart.io/qr?...` URL |
| `qr-validate` | `POST /api/validate-qr` | `valid`, `errors`, `warnings` |
| `qr-read` | `POST /qr-read` | decoded text, `found` |
| `barcode-render` | `POST /barcode` | image file |
| `wordcloud-render` | `POST /wordcloud` | image file (SVG default) |
| `table-render` | `POST /v1/table` | PNG file |
| `graphviz-render` | `POST /graphviz` | image file (SVG default) |
| `watermark-apply` | `POST /watermark` | PNG file |

Image actions write the bytes to the run's file store and return a `file` reference plus
`contentType` and `sizeBytes`; SVG output also comes back as `svg` text. A host with no file store
gets `base64` instead.

Not covered: `GET` variants (the `POST` forms are equivalent and avoid URL limits),
`POST /qr/batch` (ZIP archive of up to 1000 codes), `POST /qr-urls`, `GET /gchart` (Google Image
Charts compatibility), and the dashboard-managed dynamic QR codes — none is in the OpenAPI document
with a response shape this app could verify as useful, or each is a thin variant of an action above.

## The three things most likely to cost someone a day

### 1. A wrong API key is silently treated as no key

`Authorization: Bearer bogus` and `?key=bogus` both answer **200** and render normally — the vendor
falls back to the anonymous tier. There is no 401. The only signal is `normalized.authenticated`
in the `POST /api/validate-chart` response (`false` for an unknown key). The connection test
therefore renders a validation request and requires `authenticated: true`; checking the status code
would call every key valid. The key travels as a Bearer header, never as the `key` field, because
`POST /qr-url` echoes a body `key` into the URL it returns.

### 2. Errors on render routes are images, not JSON

A bad chart, QR or barcode request answers **400 with an image of the error** — SVG was requested,
a PNG comes back (barcodes) — and puts the message in the `X-quickchart-error` header. Reading the
body for the message gives binary. The client reads the header first, then falls back to JSON
(`{error}` / `{errors: []}`). Related: "no QR code in this image" from `/qr-read` is HTTP **500**,
so `qr-read` reports it as `found: false`, and the validate routes use **400** for "your config is
invalid", which `chart-validate`/`qr-validate` return as `valid: false` rather than throwing.

### 3. Defaults that change the output you asked for

`devicePixelRatio` defaults to **2**, so `width: 500` yields a 1000px-wide image — set it to `1` for
exact pixels. `version` defaults to Chart.js **2**, and v3/v4 options on a v2 request do nothing
(the validator only warns). Omitting `format` lets a client that accepts WebP receive WebP.
A `chart` containing JavaScript functions must be sent as a **string**, not a JSON object — the
`chart` param accepts either and sends JSON text as an object and anything else verbatim. Short
URLs from `/chart/create` are not validated at creation (a broken chart still returns a URL) and
expire after 3 days on the free tier, 6 months with a key; wordcloud and graphviz default to SVG
while chart and QR default to PNG.

## Health

- `service` — `GET /healthcheck` answers `200 {"success":true,"version":"1.4.1"}`; unauthenticated,
  5xx is `down`, an unrelated 200 is `unknown`. The vendor's Statuspage is stale (last update 2020), so it is not a signal.
- ~~`quota`~~ — declared unavailable (`informational`): the free tier is rate limited (HTTP 429,
  `Retry-After` when present) but no limit, remaining-requests header or usage endpoint is published.
