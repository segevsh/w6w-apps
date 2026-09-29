# DocuSeal

Build DocuSeal templates, send submissions out for signature, manage
submitters, and read completed documents.

- **Categories** — documents, legal, productivity
- **Auth methods** — api-key
- **Actions** — 23
- **Egress allowlist** — `api.docuseal.com`, `api.docuseal.eu`
- **Website** — https://www.docuseal.com
- **API docs** — https://www.docuseal.com/docs/api ·
  schema: `https://console.docuseal.com/openapi.yml` (OpenAPI 3.1, ~193KB)

## Setup

### API Key

1. DocuSeal → **Settings → API**, and create/copy an API key.
2. Pick the **Region** matching the data centre your account lives in — check
   which host your key was issued for if you are not sure.

The key is sent as the `X-Auth-Token` header, confirmed from the spec's own
`securitySchemes`:

```yaml
AuthToken: { type: apiKey, in: header, name: X-Auth-Token }
```

### Two fixed hosts, not a per-tenant one

The spec's `servers` block declares exactly two, both live:

```
https://api.docuseal.com   Global Server
https://api.docuseal.eu    EU Server
```

Unlike a per-tenant host (Zendesk's `acme.zendesk.com`), this is a bounded set
of two known hostnames, so both are declared in the egress allowlist and the
choice is a **Connection-level `region` field** — the same shape this pack's
`duda` app uses for its own US/EU split, and one this app's auth can use
(unlike `zohobooks`, which is forced into one `AuthDefinition` *per* region)
precisely because a plain `apiKey` header has no browser-redirect host baked
into the credential exchange the way OAuth2 does.

### The 401 you will not get a second flavor of

The OpenAPI document declares **only `200` responses** — not one path names a
`4xx` schema. Measured live 2026-09-29 against both hosts, a request with no
`X-Auth-Token` header and one with a wrong key answer identically:

```json
401 {"error":"Not authenticated"}
```

There is no vendor code to tell "missing" from "wrong" apart the way this
pack's `zohobooks` can (`code: 14` vs `code: 57`) — the connection test reads
that one `error` string rather than assuming a shape, and never echoes the key
back (the endpoint returns templates, not the token that fetched them, so the
body carries nothing to leak either way).

## Actions

| Key | Type | Description |
|---|---|---|
| `template-list` | read | List templates, filtered by name, slug, folder or archived state |
| `template-get` | read | One template — its documents, fields and submitter roles |
| `template-archive` | perform | Archive a template |
| `template-update` | perform | Rename, move to a folder, replace roles, or unarchive |
| `template-documents-update` | perform | Add, replace or remove documents in a template |
| `template-clone` | perform | Copy a template |
| `template-create-from-html` | perform | Build a template from an HTML fragment with field tags |
| `template-create-from-docx` | perform | Build a template from DOCX file(s) |
| `template-create-from-pdf` | perform | Build a template from PDF file(s) |
| `template-merge` | perform | Merge several templates' documents into a new one |
| `submission-list` | read | List submissions, filtered by template, status or search |
| `submission-create` | perform | Send an existing template out for signature |
| `submission-get` | read | One submission — its submitters, documents and events |
| `submission-archive` | perform | Archive a submission |
| `submission-update` | perform | Rename, change expiration, or archive/unarchive |
| `submission-documents-get` | read | Just a submission's completed/signed document URLs |
| `submission-create-from-emails` | perform | Quick path: one template, a list of emails |
| `submission-create-from-pdf` | perform | One-off submission built directly from PDF file(s) |
| `submission-create-from-docx` | perform | One-off submission built directly from DOCX file(s) |
| `submission-create-from-html` | perform | One-off submission built directly from HTML |
| `submitter-get` | read | One signer's own status, values and documents |
| `submitter-update` | perform | Correct contact details, pre-fill values, re-send, or mark completed |
| `submitter-list` | read | List submitters, filtered by submission, search, or completion date |

## Templates vs. submissions, and two ways in

A **template** defines what gets signed — its documents, the fields placed on
them, and the submitter roles. A **submission** is a live signature request
built from a template and sent to one or more **submitters**. Nothing reaches
a signer until a submission exists — creating or editing a template is silent.

`submission-create` needs an existing `templateId`. The `*-from-pdf`,
`*-from-docx` and `*-from-html` submission actions build the one-off documents
*and* the submission in a single call, without ever saving a reusable
template; the equivalent template-only actions exist for building a reusable
template without sending anything yet.

## Nested payloads are passed through as JSON

`submitters`, `documents` and `fields` are accepted as `json`-typed params
rather than flattened into dozens of individual form fields. DocuSeal's own
shapes for these run several levels deep — a field area's `x`/`y`/`w`/`h`/
`page`, a field's `validation` rules, a submitter's per-field overrides — and
forcing each into its own Param would make the common case worse to build a
payload that already has a well-documented JSON shape. See the DocuSeal API
docs for the full per-entry shape; each action's param hint names the minimum
that entry needs.

## Smaller sharp edges

- **`POST /templates/{id}/clone` (and other create/update calls) accept every
  body field as optional.** An empty JSON object (`{}`) is a valid request —
  DocuSeal fills in its own defaults (e.g. an existing name plus a `(Clone)`
  suffix).
- **A missing `externalId` vs. a re-used one changes what an action does.**
  `template-create-from-html`/`-docx`/`-pdf` **update** an existing template
  when `externalId` already names one, rather than creating a second — worth
  knowing before relying on these actions being create-only.
- **`archived`, `completed` and similar tri-state booleans are left unset by
  default**, not defaulted to `false` — an explicit `false` reaches the API
  (e.g. `template-update`'s `archived: false` un-archives), while leaving the
  param untouched changes nothing.
- **Pagination is an `after` cursor, not a page number.** `pagination.next`
  names the id to resume from; `template-list`, `submission-list` and
  `submitter-list` follow it automatically when Return All is on.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Declared absence — see below |
| `quota` | quota | Declared absence — see below |
| `auth:api-key` (derived) | credential | Is this connection's key live? |

### `service` — no real status page exists

Checked live 2026-09-29:

- `status.docuseal.com` does not resolve (DNS `NXDOMAIN`).
- `docuseal.statuspage.io/api/v2/summary.json` answers a `302` to
  `https://www.statuspage.io` — the unclaimed-Statuspage decoy this pack's
  other apps (AgencyZoom, Apollo, Aweber, …) have already documented: the page
  was never claimed by DocuSeal and carries no component data.
- `docuseal.instatus.com` answers `500`, not a page DocuSeal operates.

Declared `unavailable`, `severity: "informational"` — an `unavailable` entry
always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so any
other severity would pin the app's verdict at `unknown` forever. The derived
`auth:api-key` check (`GET /templates?limit=1`) is the automatable signal for
"is DocuSeal working" for anyone holding a live key.

### `quota` — no rate limit is exposed

The OpenAPI document names no `429` response on any path, and a live probe
against `GET /templates?limit=1` (both hosts, signed and unsigned) carried no
`X-RateLimit-*`, `RateLimit-*` or `Retry-After` header on a `200` or a `401`.
Declared `unavailable`, `severity: "informational"` for the same reason as
`service`.

## What this app deliberately does not do

- **Attach a local file.** Every `file` field this app sends is base64-encoded
  content or a downloadable URL, exactly as the API accepts — the sandbox has
  no local filesystem to read a PDF/DOCX from.
- **Reach a self-hosted DocuSeal deployment.** DocuSeal is open-source and
  self-hostable, but the egress allowlist can only name the two hosted API
  hosts the spec declares — a self-hosted instance's address is unknown at
  manifest time, unlike this pack's `documenso`, whose spec ships no bounded
  host set to prefer over a `*` allowlist instead.
- **Manage webhook subscriptions.** The spec's `webhooks:` section documents
  the *payload shapes* DocuSeal sends to a webhook URL configured in the
  DocuSeal UI — it is not a `POST /webhooks` management endpoint, so there is
  nothing here to wrap.
