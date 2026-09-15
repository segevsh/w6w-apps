# Mindee

Extract structured data from documents with Mindee's OCR/AI models, on the **Mindee Platform V2
API**.

- **Categories** — ai, documents
- **Auth methods** — api-key
- **Actions** — 16
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api-v2.mindee.net` (the `service` check adds `status.mindee.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.mindee.com/
- **Docs** — https://docs.mindee.com/
- **OpenAPI** — https://api-v2.mindee.net/openapi.json
- **Status page** — https://status.mindee.com/

Mindee runs custom document-AI **models** you define on the Mindee Platform against one of five
product types — Extraction, Classification, Crop, OCR (Raw Text), Split — and every one of them is
asynchronous: you enqueue a file, poll (or get a webhook) until it's processed, then read the
result. This app covers all five products plus the polling, model-discovery and RAG-document
surfaces that support them, over `api-v2.mindee.net`.

> **Everything below was verified against Mindee's own sources on 2026-09-15** — its machine-readable
> OpenAPI 3.1 document ([`api-v2.mindee.net/openapi.json`](https://api-v2.mindee.net/openapi.json),
> linked from [`docs.mindee.com/integrations/api-reference`](https://docs.mindee.com/integrations/api-reference)),
> the official [`mindee-api-python`](https://github.com/mindee/mindee-api-python) SDK source, the
> `docs.mindee.com` pages it links (fetched as clean Markdown via GitBook's `.md` suffix), and live
> probes against `api-v2.mindee.net` and `status.mindee.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to cost you a day

### 1. The wire auth format contradicts the obvious reading of the OpenAPI security scheme

The spec declares the credential as `{"type": "apiKey", "in": "header", "name": "Authorization"}` —
which, on a header literally named `Authorization`, most people (and most other APIs in this pack)
read as "send `Bearer <key>`". Mindee's is the opposite: the **raw key, no prefix at all**. Confirmed
three ways:

1. **The official SDK** (`mindee/v2/mindee_http/mindee_api_v2.py`): `headers["Authorization"] =
   self.api_key` — verbatim, no scheme string.
2. **A live probe** (2026-09-15): sending `Authorization: Bearer md_...` against
   `api-v2.mindee.net` answers a *distinct* error —
   `401-009 "Organization ID is required for JWT authentication. Do not include \`Bearer \` if
   using an API key."` — not a silent accept and not the generic invalid-key error.
3. **Mindee's own error-handling docs** state the rule directly: *"API keys are not JWTs: do not
   include `Bearer` in your `Authentication` header."*

This app's [`auth/api-key.ts`](auth/api-key.ts) sets `apiKey: { in: "header", name: "Authorization"
}` with **no `prefix`**, and `sign`/`test` both build the header through the one shared
`authHeaders()` function so there is exactly one place this could regress.

V1 and V2 keys are entirely separate — Mindee's own FAQ: *"No, V1 and V2 do not share API key
information."* This app is V2-only (`api-v2.mindee.net`); a legacy V1 key (used against
`api.mindee.net`) will not authenticate here.

### 2. Every inference is asynchronous — enqueue never returns extracted data

`POST /v2/products/{product}/enqueue` answers **202 with a `Job`** (`id`, `status`, `pollingUrl`,
`resultUrl` once ready) — never the extracted fields. A workflow has two ways to get the actual
result:

- **Poll** [`job-status-get`](actions/job-status-get.ts) (`GET /v2/jobs/{job_id}`) until `status` is
  `Processed` or `Failed`, then call the matching product's `*-result-get` action with the **same
  id** the job returned.
- **Configure a webhook on the Mindee Platform** for the model (there is no webhook-*management*
  route in the API — `POST /v2/search/models`'s `webhooks[]` and each enqueue action's
  `webhookIds` param only *reference* webhooks already created on the Platform UI, by ID).

`job.id` and the `inference_id` every `*-result-get` action expects are the **same value** — this
isn't stated as a single sentence anywhere in the docs, but the official Python SDK's
`enqueue_and_get_result` confirms it structurally: it polls `get_job(enqueue_response.job.id)`, and
the public `Client.get_result(response_type, inference_id)` takes that identical id.

`job-status-get` always sends `?redirect=false`. Without it, once a job reaches `Processed` the
vendor answers **HTTP 302** with a `Location` header instead of 200 with the `Job` body — this app's
[`lib/client.ts`](lib/client.ts) sends every request with `redirect: "manual"`, so an un-flagged
poll would surface as an opaque non-2xx response instead of the `Job` a poll loop needs.

### 3. One route's request body is missing from the live `openapi.json` — confirmed as a spec bug, not a different shape

`POST /v2/products/ocr/enqueue` has **no `requestBody` at all** in the top-level
`api-v2.mindee.net/openapi.json` — every other one of the five enqueue routes declares one.
Guessing here would violate this pack's "leave it out if you can't confirm it" rule, so instead:
`docs.mindee.com/integrations/api-reference/ocr-models.md` embeds this **exact route's** OpenAPI
fragment inline (GitBook renders each doc page's live route widget from the same `mindee-api` spec
source), and that fragment **does** name a `requestBody` — the identical `UtilityEnqueueForm` schema
(`model_id`, `file`, `url`, `file_base64`, `webhook_ids`, `filename`, `alias`) that Classification,
Crop and Split declare in the top-level document. [`actions/ocr-enqueue.ts`](actions/ocr-enqueue.ts)
uses that confirmed shape and documents the gap inline.

## The five products

| Product | Enqueue | Result | What it returns |
|---|---|---|---|
| Extraction | `extraction-enqueue` | `extraction-result-get` | Fields per the data schema you define, plus optional raw text / polygons / confidence / RAG |
| Classification | `classification-enqueue` | `classification-result-get` | One `document_type` label per file |
| Crop | `crop-enqueue` | `crop-result-get` | Cropping coordinates per detected object |
| OCR (Raw Text) | `ocr-enqueue` | `ocr-result-get` | Every word per page, each with its own polygon, plus full-page text |
| Split | `split-enqueue` | `split-result-get` | Page ranges + a class per range, for a multi-document file |

Only Extraction carries the extra enqueue options (`rawText`, `polygon`, `confidence`, `rag`,
`textContext`, `dataSchema`) and the RAG-document actions below — the other four share one plain
`UtilityEnqueueForm` shape verbatim (confirmed field-for-field against the OpenAPI document, with
OCR's gap closed per finding 3 above).

`file` (a base64 param, decoded to a `Blob` and sent as the multipart `file` field) is used in
preference to Mindee's own `file_base64` field, per the vendor's explicit guidance:
*"file_base64 — Used as an alternative to `file`. **Not recommended**, for specific use only."* A
`url` param is offered as the alternative (Mindee fetches it server-side; must be public HTTPS, no
auth headers, no redirects followed).

## Discovery, polling and RAG

- **`model-search`** — `GET /v2/search/models`. There is no plain "list models" route, only this
  search (every filter optional); it's where a workflow finds the `modelId` every enqueue action
  needs.
- **`job-status-get`** — `GET /v2/jobs/{job_id}`, works for a job from any of the five products.
- **`rag-document-upload` / `rag-document-get` / `rag-document-update` /
  `rag-document-search`** — Extraction-only Retrieval-Augmented Generation: upload a reference
  document, optionally annotate it and set it `Active`/`Inactive`, then set `rag: true` on
  `extraction-enqueue` against the same model. Uploads take **only** a raw-bytes `file` — the
  vendor's own upload schema
  (`Body_Upload_RAG_Documents_for_Extraction_Product...`) has no `url` alternative, unlike every
  enqueue route, so this app does not expose one.

`dataSchema` (extraction enqueue override) and `annotation` (RAG document update) are both
`type: "json"` params passed through to fields the vendor expects as JSON — `extraction-enqueue`
needs a JSON **string** multipart field, `rag-document-update` needs a parsed JSON **body** field, so
[`lib/client.ts`](lib/client.ts) exposes both directions (`asJsonText`, `asOptionalJsonValue`)
rather than assuming the host always hands a `json` param through as one particular shape.

## Health checks

**`service`** reads [`status.mindee.com`](https://status.mindee.com/api/v2/summary.json) — a real,
genuinely-claimed Atlassian Statuspage (`page.name: "Mindee"`), not an unclaimed decoy or a generic
rollup. It covers more than this app calls, though: measured 2026-09-15, the page lists **seven**
components — two group containers ("Mindee V1", "Mindee V2") and five leaves: `API V1
(api.mindee.net)`, `Platform V1 (platform.mindee.net)`, `API V2 (api-v2.mindee.net)`, `Website`, and
`Platform V2 (app.mindee.com)`. This app only ever calls `api-v2.mindee.net`, so the check reads
**only** the `API V2 (api-v2.mindee.net)` component (id `7hyjmkw09n77`) rather than the page-level
`status.indicator` — trusting the page-wide indicator would report this app degraded over a
Platform-UI or legacy-V1 incident that never touches its own traffic.

**`quota`** is a declared absence, `informational` severity. A live response from
`api-v2.mindee.net` — checked on both a successful `GET /v2/search/models` and a rejected 401 —
carries no `X-RateLimit-*`/`RateLimit-*` header of any kind, and
`integrations/technical-limitations.md` documents only two fixed organization-wide ceilings (200
enqueue/min, 1,200 poll/min) with the `429` refusal itself as the only signal. There is also no
separate plan-consumption endpoint (unlike, e.g., Apify's `/v2/users/me/limits`) to report headroom
from instead.

The credential probe (`auth/api-key.ts`'s `test` hook, projected automatically as `auth:api-key`) is
`GET /v2/search/models?per_page=1` — the cheapest authenticated read Mindee documents, needing no
per-model scope (an API key is organization-wide, not scoped per model) and returning nothing
secret. Mindee's three distinguishable 401 codes (`401-001` invalid key, `401-008` missing
credential, `401-009` Bearer-prefix misuse — see finding 1) are read from the response **body**,
never inferred from the bare HTTP status, and reported as three different messages.

## Errors

Every 4xx/5xx response is an RFC 9457 problem-details body:
`{status, title, detail, code, errors: [{pointer, detail}]}`. `code` is the stable identifier
Mindee's own docs and support are written against (e.g. `401-001`, `422-...`), and `errors[].pointer`
names exactly which field failed a 422 validation — both are surfaced verbatim by
[`formatMindeeError`](lib/client.ts) rather than flattened into a bare HTTP status.

## What's deliberately left out

- **Webhook management** — no such route exists in the API; webhooks are created on the Mindee
  Platform UI per model and only *referenced* here by ID.
- **A "sync" call** — the API has no synchronous inference route; every product is enqueue-then-poll
  (or webhook).
- **The V1 API** (`api.mindee.net`) — a separate, older product surface with its own key format;
  out of scope for this app, which targets V2 only.
