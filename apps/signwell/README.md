# SignWell

Send documents and templates out for e-signature, track and remind recipients, run bulk sends,
and fetch completed documents.

- **Categories** — documents, legal, productivity
- **Auth methods** — api-key
- **Actions** — 18
- **Egress allowlist** — `www.signwell.com` (the API), `status.signwell.com` (the status probe only)
- **Website** — https://www.signwell.com
- **API docs** — https://developers.signwell.com ·
  schema: `https://developers.signwell.com/openapi/resources-and-endpoints.json` (OpenAPI 3.0.1,
  ~229KB, fetched 2026-10-06)

## Setup

### API Key

SignWell → **Settings → API**, create or copy an API key. It is sent as the `X-Api-Key` header,
confirmed from the spec's `securitySchemes`:

```yaml
api_key: { type: apiKey, in: header, name: X-Api-Key }
```

There is one host, `https://www.signwell.com`, and every path lives under `/api/v1`.

### The auth probe

`GET /api/v1/me` returns the membership role, the user (id, name, email), the account and workspace
(plan tier, active templates, preferences) and the contact. None of those fields is the key, and
every issued key can call it. A pass requires that documented shape (an object with `user` and
`account`); a 200 that is anything else fails. A rejection is classified from the vendor's own code,
measured live 2026-10-06 — both answer HTTP 401, with different bodies:

```json
no key    → {"message":"Missing or invalid authorization key","meta":{"error":"missing_authorization_key_error",…}}
wrong key → {"message":"Missing or invalid authorization key","meta":{"error":"api_key_unauthorized_error",…}}
```

## Actions

| Key | Type | Description |
|---|---|---|
| `document-create` | perform | Create a document from a file URL or base64 and send it (or keep it as a draft) |
| `document-create-from-template` | perform | Create a document from one or more templates, assign placeholders, pre-fill fields |
| `document-get` | read | One document — status, per-recipient state and signing URLs, files |
| `document-send` | perform | Send a draft document, optionally updating its settings first |
| `document-delete` | perform | Delete a document |
| `document-completed-pdf` | read | Download URL for a completed document's PDF or zip |
| `document-remind` | perform | Remind recipients who have not signed |
| `document-update-recipients` | perform | Change a recipient's name or email |
| `template-get` | read | One template — placeholders, fields (with `api_id`), files |
| `template-create` | perform | Create a template from files, with placeholders |
| `template-delete` | perform | Delete a template |
| `bulk-send-list` | search | List bulk sends (page-numbered) |
| `bulk-send-get` | read | One bulk send and its completion counts |
| `bulk-send-create` | perform | Send templates to many recipients from a base64 CSV |
| `account-get` | read | Who the key belongs to, plan and preferences |
| `webhook-list` | search | List registered webhooks |
| `webhook-create` | perform | Register a callback URL for document events |
| `webhook-delete` | perform | Remove a webhook |

Nested payloads (`files`, `recipients`, `fields`, `metadata`, …) are `json` params in SignWell's own
field names, so a value maps one to one onto the API; each action's hints name the minimum an entry
needs. Unset options are omitted from the request; an explicit `false` or `0` is sent.

## Not covered

Left out rather than guessed at:

- `PATCH /documents/{id}/authentication` (Update Authentication) — passcode/auth changes.
- `GET`/`DELETE /api_applications/{id}` — API-application settings.
- `GET /bulk_sends/{id}/documents`, `GET /bulk_sends/csv_template`, `POST /bulk_sends/validate_csv`.
- `PUT /document_templates/{id}` (Update Template).
- `GET /documents/{id}/nom151_certificate` — Mexico NOM-151 certificate.
- **Raw PDF bytes.** `GET /documents/{id}/completed_pdf` returns binary unless `url_only=true`;
  the sandbox cannot carry a binary body, so `document-completed-pdf` always asks for the URL.

## Sharp edges

- **There is no list endpoint for documents or templates.** The spec has no `GET /documents` and no
  `GET /document_templates`; both are read by id only. Keep the ids a create returns, or take them
  from a webhook payload.
- **Creating a document sends it.** `document-create` and `document-create-from-template` notify
  recipients immediately unless **Create as draft** is on; use `test_mode` while building a flow.
  Neither is idempotent.
- **Three error shapes, no single envelope.** Auth and not-found use
  `{"message", "meta": {"error", "message"}}`; validation (400/422) uses `{"errors": {<field>: …}}`
  with dynamic keys; rate limiting (429) uses `{"error": "<text>"}`. Errors surface the vendor's own
  code or field messages.
- **`document-remind` returns the document.** The spec's 201 example for the remind call is the
  full document, so that is what is returned.
- **Pagination** is page-numbered (`page` from 1, `limit` 1–50 default 10), on the bulk-send list
  only.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is the vendor up? Informational — see below |
| `api` | dependency | Is `www.signwell.com/api/v1` answering? Unsigned |
| `quota` | quota | Declared absence — see below |
| `auth:api-key` (derived) | credential | Is this connection's key live? (`GET /me`) |

**`service`** reads `https://status.signwell.com/api/v2/summary.json`. Checked 2026-10-06: it is a
real Atlassian Statuspage (`page.name: "SignWell"`, `components`/`incidents`/`scheduled_maintenances`
and `status.indicator`; `/api/v2/status.json` also answers; a nonsense sibling path is a 404; no
redirect). But its **only component is `Docsketch Service`** — nothing named API, documents or
signing — so the verdict is the page's top-level indicator, declared `informational`, and the
component is reported as detail. The check returns `unknown` if the page stops naming itself
`SignWell` or stops being Statuspage-shaped.

**`api`** makes an unsigned `GET /api/v1/me`. A schema-correct 401 carrying the `meta.error` envelope
proves the API and its auth layer answered, so it is a pass; an HTML shell or a 5xx is `down`.

**`quota`** is a declared absence. SignWell sends `x-ratelimit-limit` (50),
`x-ratelimit-remaining` and `x-ratelimit-reset` (an ISO timestamp), measured on unauthenticated 401s
only; the window is seconds long, the spec documents no ceiling or usage endpoint, and the headers
were not observed on an authenticated 200. A 429 body names the limit and reset time when it hits.

## Icon

`assets/icon.svg` is SignWell's own mark, saved verbatim from
`https://developers.signwell.com/favicon.ico` — which is an SVG (695 bytes, `file(1)`: "SVG Scalable
Vector Graphics image"), not an ICO. Format with `deno task fmt`, never bare `deno fmt`, which
rewrites it.
