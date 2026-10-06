# Formstack Documents

Document generation on **Formstack Documents** (formerly **WebMerge**): design a template once,
then merge data into it to produce PDFs, Office files or emails. 26 actions across documents,
data routes, deliveries and PDF tools.

- **API docs** — https://www.webmerge.me/developers (Overview, Authentication, Documents, Data
  Routes, Tools). An HTML reference; no OpenAPI document exists.
- **Base URL** — `https://www.webmerge.me/api` (merge URLs are on `https://www.webmerge.me`, see below).
- **Auth** — HTTP Basic: **API Key** as username, **Secret** as password (`basic`, field type
  `secret`, credential only ever touched in `sign`).
- **Network** — one host: `www.webmerge.me`.
- **Icon** — the Formstack mark, verbatim (same `assets/icon.svg` as `apps/formstack`; Formstack
  Documents ships under the Formstack brand and the vendor serves no separate favicon SVG).

Verified 2026-10-06 against the developer docs and live unauthenticated probes
(`/api/documents` and `/api/routes` answer a bare 401).

## Actions

| Group | Actions |
|---|---|
| Documents | `document-list`, `document-get`, `document-create`, `document-update`, `document-copy`, `document-delete`, `document-fields-get`, `document-file-get`, `document-delivery-list`, `document-delivery-create`, `document-merge` |
| Data routes | `route-list`, `route-get`, `route-create`, `route-update`, `route-delete`, `route-fields-get`, `route-rules-get`, `route-delivery-list`, `route-delivery-create`, `route-merge` |
| Tools | `file-combine`, `file-convert-to-pdf`, `pdf-compress`, `pdf-encrypt`, `pdf-split` |

### Not covered

The documented API has no endpoints for listing merge history, folders, or deleting a delivery /
route rule, and no pagination — `GET /documents` returns everything (narrow it with `search` /
`folder`). Those are therefore not actions.

## Things that cost a day

1. **Merge URLs are not under `/api`.** `POST /merge/<id>/<key>` and `POST /route/<id>/<key>`;
   everything else is `/api/...`. The merge key is a property of the document/route (not the API
   credential) — the merge actions look it up with one extra GET when you leave `key` empty.
2. **One endpoint, several body shapes.** `download=1` returns raw PDF bytes, otherwise
   `{"success":1}`; a route merge of 2+ documents returns a JSON envelope
   `{"success":1,"files":[{"name","file_contents"}]}`. Binary results come back base64-encoded
   under `file: { contentBase64, contentType, sizeBytes }`; the JSON envelope is passed through.
   The client sniffs the first byte rather than trusting `Content-Type`.
3. **A rejected credential is a bare 401 with an empty `text/html` body**, so there is no vendor
   error code to read. The credential probe (`GET /documents?search=...`) therefore also requires
   a JSON **array** on success, so an HTML shell can never pass.
4. The docs' delivery example sends `type=html` but the description lists `email, webhook, etc.` —
   treat the description as authoritative. Numeric fields (`active`, IDs) come back as strings.

## Health checks

- `service` — Formstack's status host (`status.formstack.com`) redirects to the parent brand's page,
  `www.intellistackstatus.com` (`page.name: "Intellistack"`), a portfolio page. Only the component
  group **Formstack Documents** (`zt11rdz1rk9k`) is read; the verdict follows `API & Document
  Generation` and `Website & Management Portal`, while `SendGrid API v3/SMTP` and `Billing Services`
  are reported without driving state. Other products' outages never affect this app.
- `quota` — declared absence (`informational`): the docs name no rate limit or quota header.
- `auth:api-key` — derived from the auth `test` hook.

## Layout

```
index.ts            AppDefinition: 26 actions, 1 auth, 2 health checks
auth/api-key.ts     Basic key:secret, probe = GET /documents?search=...
lib/client.ts       WebMergeClient (/api vs site-root paths, JSON-or-file bodies)
actions/            one file per action
health/             service (Statuspage, Documents group) + quota (unavailable)
tests/              101 tests, mocked HookContext
```
