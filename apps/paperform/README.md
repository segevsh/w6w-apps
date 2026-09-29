# Paperform

Manage Paperform forms, fields, submissions and webhooks over the **Paperform API v1**
(`api.paperform.co/v1`).

- **Categories** — forms
- **Auth methods** — api-key
- **Actions** — 25
- **Health checks** — 2 (`service`, `request-rate`) + the derived `auth:api-key`
- **Egress allowlist** — `api.paperform.co` (the `service` check adds `paperform.statuspage.io`
  to its own hook allowlist, never to the app's)
- **Website** — https://paperform.co/
- **API docs** — https://paperform.readme.io/reference/getting-started-1
- **Status page** — https://paperform.statuspage.io/

> **Everything below was verified against Paperform's own sources on 2026-09-29** — its
> OpenAPI 3.1 document (embedded as JSON on every `paperform.readme.io/reference/*` page under
> an `oasDefinition` key — there is no single downloadable spec file) and live probes against
> `api.paperform.co`. **The candidate catalog's `developers.paperform.co` link is dead** — it
> now serves an unrelated internal job-application form; every fact below comes from the
> `readme.io` reference tree instead. Nothing here came from a third-party integration
> directory.

## The five things most likely to go wrong

### 1. The docs live inside a ReadMe reference tree, not one downloadable spec file

Unlike this pack's `cloudconvert` app (a hand-written, no-spec-file API) or `apify` (a single
downloadable OpenAPI document), Paperform's reference is ReadMe-hosted and initially looked
hand-written too. It isn't: every `paperform.readme.io/reference/<slug>` page embeds a
`<script id="ssr-props">` JSON blob, and one of its top-level keys, `oasDefinition`, carries
Paperform's **complete** OpenAPI 3.1 document — `paths` for all 38 non-Papersign + Papersign
operations, `components.schemas`, `components.parameters`, `components.responses` — not just
that one page's own operation. Every path, parameter, and schema in this app was read from that
embedded document, cross-checked against the sidebar's page-by-page listing (`getting-started-1`,
`forms-1` → `listforms`/`getform`/`updateform`, `form-fields-1` → …, etc.) rather than the
rendered prose.

### 2. The pagination envelope puts its fields as SIBLINGS of `results`, not nested inside it

A list endpoint's response schema is an `allOf` merge of two object schemas: one with
`status`/`results`, the other `$ref`ing `#/components/schemas/Pagination`
(`total`/`has_more`/`limit`/`skip`). `allOf` merges both schemas' properties into ONE object, so
`total`/`has_more`/`limit`/`skip` sit next to `status` and `results` at the **top level**:

```json
{
  "status": "ok",
  "results": { "forms": [ … ] },
  "total": 57,
  "has_more": true,
  "limit": 20,
  "skip": 0
}
```

`lib/client.ts`'s `page()` keeps the whole envelope intact; every `list-*` action returns
`{ results, total, hasMore, limit, skip }` in one object rather than requiring a caller to stitch
two responses together.

### 3. A missing API key and a wrong one are indistinguishable

Measured live on 2026-09-29: a request with **no** `Authorization` header and one with a
syntactically-plausible but fake bearer token both answer the **identical**

```json
{"status":"error","error_type":"authentication","message":"Could not authenticate","details":["Please pass a valid API Key in the Bearer header"]}
```

`auth/api-key.ts`'s `test` hook does not try to tell them apart — the same finding this pack's
`cloudconvert` app documents for its own vendor. API access is also plan-gated (Standard or
Business only), and a 401 is the same whether the key is bad or the plan lacks API access at all,
so `test`'s failure message names both possibilities rather than asserting the key itself is
wrong.

### 4. A 429 answers `text/html`, not JSON — everything else does

Confirmed live by bursting past the documented 60-requests/minute ceiling: a normal error
(400/401/403/404/422/5xx) answers
`{"status":"error","error_type","message","details"?}`, but a **429** answers Paperform's
generic rate-limit HTML page (`content-type: text/html`), with `x-ratelimit-reset` (a Unix
timestamp) and `retry-after` (seconds) added to the response headers — headers that were absent
on every non-429 response observed. `lib/client.ts`'s `formatPaperformError` special-cases this
before attempting `JSON.parse` at all.

### 5. The partial-submission endpoints key their response with a HYPHEN

`GET /forms/{slug_or_id}/partial-submissions` answers `{"results":{"partial-submissions": [...]}}`
and the singular variants answer `{"results":{"partial-submission": {...}}}` — read directly from
the OAS response schema, not assumed from the endpoint's own kebab-case path. Every other list/get
endpoint in this API uses a plain, unhyphenated key (`forms`, `submissions`, `webhooks`, `spaces`,
`field`, `space`). `actions/list-form-partial-submissions.ts` and its four siblings document this
inline; the test suite pins it by also asserting that an underscore-keyed body (the "expected"
spelling) yields no results.

## Auth

One method: `api-key`, type `bearer` — `Authorization: Bearer <key>`.

### The probe is `GET /v1/forms?limit=1`

Paperform documents no scoped-key mechanism and no `/me`/account-info endpoint at all — unlike
CloudConvert's six independent scopes (which at least motivate a documented choice), Paperform's
own OpenAPI document simply names no identity endpoint. `list-forms`, the operation nearly every
other action depends on transitively, is the narrowest real, side-effect-free probe available.
`limit=1` keeps it cheap; Paperform's 60-requests/minute ceiling applies flatly to every endpoint
(see `health/request-rate.ts`), so this costs one request against that shared budget like any
other call.

No `afterConnect` is declared: there is nothing in Paperform's API to read a display label from.

## Actions

25 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-forms` | search | `GET /v1/forms` |
| `get-form` | read | `GET /v1/forms/{slug_or_id}` |
| `update-form` | perform | `PUT /v1/forms/{slug_or_id}` (Business) |
| `list-form-fields` | search | `GET /v1/forms/{slug_or_id}/fields` |
| `get-form-field` | read | `GET /v1/forms/{slug_or_id}/fields/{field_key}` |
| `update-form-field` | perform | `PUT /v1/forms/{slug_or_id}/fields/{field_key}` |
| `list-form-submissions` | search | `GET /v1/forms/{slug_or_id}/submissions` |
| `get-form-submission` | read | `GET /v1/forms/{slug_or_id}/submissions/{id}` |
| `delete-form-submission` | perform | `DELETE /v1/forms/{slug_or_id}/submissions/{id}` |
| `get-submission` | read | `GET /v1/submissions/{id}` |
| `delete-submission` | perform | `DELETE /v1/submissions/{id}` |
| `list-form-partial-submissions` | search | `GET /v1/forms/{slug_or_id}/partial-submissions` |
| `get-form-partial-submission` | read | `GET /v1/forms/{slug_or_id}/partial-submissions/{id}` |
| `delete-form-partial-submission` | perform | `DELETE /v1/forms/{slug_or_id}/partial-submissions/{id}` |
| `get-partial-submission` | read | `GET /v1/partial-submissions/{id}` |
| `delete-partial-submission` | perform | `DELETE /v1/partial-submissions/{id}` |
| `list-form-webhooks` | search | `GET /v1/forms/{slug_or_id}/webhooks` (Business) |
| `create-form-webhook` | perform | `POST /v1/forms/{slug_or_id}/webhooks` (Business) |
| `get-form-webhook` | read | `GET /v1/webhooks/{id}` (Business) |
| `update-form-webhook` | perform | `PUT /v1/webhooks/{id}` (Business) |
| `delete-form-webhook` | perform | `DELETE /v1/webhooks/{id}` (Business) |
| `list-spaces` | search | `GET /v1/spaces` (Business) |
| `get-space` | read | `GET /v1/spaces/{id}` (Business) |
| `get-space-forms` | search | `GET /v1/spaces/{id}/forms` (Business) |
| `get-file-urls` | read | `POST /v1/files` |

"(Business)" marks an endpoint Paperform's own docs state is "exclusively available as part of
the Business API" — everything else needs only the Standard (or Business) API plan.

### Idempotency

Every `PUT` action (`update-form`, `update-form-field`, `update-form-webhook`) is
`idempotent: true` — replacing the same fields with the same values leaves the resource in the
same state no matter how many times it runs. Every `DELETE` action is `idempotent: true` — the
end state (resource gone) is the same regardless of repeat calls; Paperform documents no distinct
response for deleting an already-deleted resource. `create-form-webhook` is `idempotent: false`:
Paperform documents no idempotency key for webhook creation, so a retry creates a second webhook.

### Notes on individual actions

- **`update-form-field`'s type-specific options are free-form JSON**, matching Paperform's own
  request body 1:1, rather than a generated per-type form. Paperform's `Field` schema is a
  discriminated union across ~24 field types (`text`, `dropdown`, `choices`, `scale`, `rank`,
  `calculations`, `products`, `matrix`, …), each keyed by its own type name and shaped
  differently — the same choice this pack's `cloudconvert` app makes for its own free-form task
  graph, for the same reason: a static per-type form would either omit most of the catalog or
  drift out of sync with it. The four examples Paperform's own OpenAPI document embeds
  (dropdown/choices/scale/rank options, a calculation, a product list) are reproduced in the
  param's hint.
- **`get-file-urls` is a `POST` with no side effect** — it turns a Paperform-hosted file URL
  (from a `file`/`image`/`signature` submission answer) into a signed URL and a direct-access
  URL, reading back state rather than creating or modifying anything. Declared `type: "read"`
  despite the HTTP verb.
- **`get-space-forms`'s own response schema, in Paperform's OpenAPI document, points its `forms`
  array at `FormFieldCollectionItem` rather than `Form`** — almost certainly a copy-paste slip in
  the vendor's own spec, since every other forms-list endpoint here uses the schema its name
  implies. Not "fixed" here: the action returns whatever the server actually sends.
- **`list-forms`/`list-form-submissions`/etc.'s array query params (`search_fields`) are sent as
  repeated `key=value` instances**, not comma-joined — Paperform's OAS declares no explicit
  `style`/`explode` for them, which defaults to OpenAPI's `form`/`explode: true`. (One query
  parameter this API *does* declare `style: form, explode: true` explicitly —
  `papersignDocumentStatus`, in the out-of-scope Papersign section — confirming that's the
  vendor's own intended default, not an assumption made here.)

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — `paperform.statuspage.io`, and it self-identifies correctly

Atlassian Statuspage. `page.name` is `"Paperform"` and `page.url` is
`"https://paperform.statuspage.io"` — unlike this pack's `fillout` app (whose Statuspage instance
is branded for a different product name), no page-identity workaround is needed here. It carries
a component literally named `"API"`, plus `Paperform Dashboard`, `Forms`, and
`Submission Processing (Emails, Webhooks, Integrations)` — all this app's own surface — and a
`Stepper` GROUP (a separate, newer Paperform product) whose children are skipped like any other
`group: true` row.

### `request-rate` — a live probe, not a declared absence

Paperform's own "Getting Started" docs name `X-RateLimit-Limit`/`X-RateLimit-Remaining` as riding
every response, and measured live they do — including on a bare, unauthenticated request. A burst
past the ceiling produced a real `429` carrying `x-ratelimit-reset` (Unix timestamp) and
`retry-after` (seconds), headers absent otherwise. The check reads these off `GET /v1/forms?limit=1`
(signed, the same call `auth/api-key.ts` probes) without parsing the response body. `minIntervalSeconds: 60`
keeps the check itself from eating into the very budget it reports on.

There is no separate `quota` check: Paperform documents no credits/plan-usage endpoint distinct
from this flat, endpoint-agnostic rate limit, so there is only one quota dimension to report and
`request-rate` is it.

## Deliberately not covered

- **Papersign** (`/papersign/*`) — a standalone e-signature product sharing this same OpenAPI
  document, with its own documents/folders/webhooks/spaces sub-API (`listpapersigndocuments`,
  `papersignsenddocument`, `papersigncopydocument`, …, 17 operations in total). It is a distinct
  product with its own pricing (see `getting-started-1`'s Authentication section: "The Paperform
  API ... and the Papersign API for Papersign"), not just another resource under the same
  product, so it is left for a separate app rather than folded into this one.
- **Products, coupons, translations** (`/forms/{slug_or_id}/products/*`,
  `/forms/{slug_or_id}/coupons/*`, `/translations/*`) — commerce/localisation configuration for a
  payment-enabled or multi-language form. Left out to keep this app's surface on the core
  form/field/submission/webhook lifecycle; nothing here was left out because it could not be
  confirmed — every one of these endpoints is documented in the same OpenAPI document the rest of
  this app was built from.
- **`create-space`/`update-space`** (`POST /spaces`, `PUT /spaces/{id}`) — space creation/editing.
  `list-spaces`/`get-space`/`get-space-forms` (read-only) are covered; writing spaces was left out
  to keep this app's mutation surface centred on forms/fields/submissions/webhooks.

## Icon

`assets/icon.svg` is Paperform's own mark, downloaded **verbatim** from
`https://paperform.co/favicon.svg` on 2026-09-29 — 749 bytes, `image/svg+xml`, confirmed live
`200`.

## Layout

```
paperform/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # PaperformClient, envelope/pagination handling, error formatting
│   └── params.ts                  # shared Param fragments, pagination helpers
├── auth/api-key.ts              # bearer key: sign, test
├── actions/                     # one file per action (25)
├── health/
│   ├── service.ts                 # paperform.statuspage.io (Atlassian Statuspage)
│   └── request-rate.ts            # X-RateLimit-* headroom, signed
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
