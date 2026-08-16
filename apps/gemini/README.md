# Google Gemini

Call the **Gemini Developer API** — generate content, count tokens, embed content, list and
inspect models.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 6
- **Egress allowlist** — `generativelanguage.googleapis.com`
- **Website** — https://ai.google.dev
- **API docs** — https://ai.google.dev/api (the `$discovery/rest` document at
  `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta` is the authoritative
  reference; the human docs are generated from it)

## This is the Gemini Developer API, NOT Vertex AI

Google ships **two** unrelated ways to call Gemini models:

| | Gemini Developer API (this app) | Vertex AI |
|---|---|---|
| Host | `generativelanguage.googleapis.com` | `{region}-aiplatform.googleapis.com` |
| Auth | API key (`x-goog-api-key`) | GCP service account / OAuth |
| Billing | Google AI Studio account | GCP project |
| Status | not on any public dashboard (see below) | Google Cloud status, component "Vertex Gemini API" |

They are separate products with separate hosts, separate auth, and separate status surfaces. This
app deliberately calls only the Developer API. **Do not "fix" this app to call Vertex** — that is a
different integration (GCP service-account auth, a per-region host, a different request shape for
some fields) and out of scope here.

## Scope — what's included and what's deliberately left out

All actions were verified against the live `$discovery/rest` document (366,326 bytes, fetched
2026-08-16), not inferred from a sibling app or marketing copy.

- **`generate-content`** (`models.generateContent`) — the core call. `contents` is passed through
  verbatim as the API's own `Content[]` shape (`{ role, parts: [...] }`) rather than flattened to a
  single string, so multi-turn history and multimodal `parts` survive.
- **`count-tokens`** (`models.countTokens`) — free, no generation.
- **`embed-content`** (`models.embedContent`) and **`batch-embed-contents`**
  (`models.batchEmbedContents`) — single and multi-text embeddings.
- **`list-models`** / **`get-model`** (`models.list` / `models.get`).

**Streaming is excluded.** `models.streamGenerateContent` exists in the API, but `ctx.fetch` returns
one `Response` the runtime reads to completion — there is no hook surface in this pack for handing a
caller an incremental stream, so offering the action would silently buffer the whole response anyway
with none of streaming's latency benefit.

**File and caching surfaces are excluded.** The discovery document lists `files`, `media`,
`cachedContents`, `corpora`, `fileSearchStores`, `batches`, `tunedModels`, and `generatedFiles`
resources beyond `models`. `cachedContents` create/get/list/patch/delete would need multipart or
long-lived-resource management this app doesn't attempt to verify in one pass; `files`/`media` are
upload-heavy (`media.upload`) and a poor fit for a single `ctx.fetch` call; `batches` is
long-running-operation shaped (create, then poll). All are left out rather than guessed at — a
`generate-content` call can still reference an existing `cachedContents/{id}` by name if a caller
builds one out-of-band, but this app offers no action to create one.

**`tools` / function calling / grounding are left out of `generate-content`'s params.** The API
supports them (`GenerateContentRequest.tools`, `toolConfig`), but they were judged out of scope for
a first cut; `contents` and `safetySettings` already accept raw JSON, so a caller who needs a
`tools` array today has no way to pass it through this action.

## Auth

**API key** is the only auth path the Gemini Developer API exposes — no OAuth, no service account.
Mint one at [Google AI Studio](https://aistudio.google.com/apikey).

Sent as the **`x-goog-api-key` header**, not the `?key=` query parameter — a credential in a query
string ends up in access logs and `Referer` headers. Verified live (2026-08-16): both forms are
fully equivalent — an identical `400 INVALID_ARGUMENT` / `API_KEY_INVALID` error body comes back for
a bad key on either the header or the query parameter.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
this app performs.

### Is the vendor up?

**No machine-readable status feed exists for this product.** Checked live (2026-08-16):

- `https://www.google.com/appsstatus/dashboard/incidents.json` (the Google Workspace Status
  Dashboard, used by this pack's other `google-*` apps) does carry a `"Gemini"` component — but
  that's the Workspace assistant surfaced inside Gmail/Docs/Chat/Meet, a different product from the
  developer API this app calls. Reading that component's state as this API's status would report the
  wrong thing entirely, not just an unrelated one.
- `https://status.cloud.google.com/incidents.json` (Google Cloud Platform infrastructure status)
  lists a `"Vertex Gemini API"` component (confirmed via `products.json`) — that is Vertex AI, the
  product this app explicitly does not call (see above). No `"Generative Language API"`, `"Gemini
  Developer API"`, or `"AI Studio"` component exists on either feed.

Declared as an honest absence (`health/service.ts`) rather than guessed at, exactly like this pack's
`google-business-profile` and `youtube` apps for the same reason: the product sits outside every
Google status surface this pack knows how to read.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

The single auth method probes:

```
GET /v1beta/models
```

Lists models. Needs no scope beyond a live key, and returns no credential material of its own —
nothing to echo back. Verified live (2026-08-16): an unauthenticated request returns
`403 PERMISSION_DENIED`, and a syntactically-valid-but-wrong key returns
`400 INVALID_ARGUMENT` / `API_KEY_INVALID` — both real, schema-correct Google API error bodies, which
is what `test` classifies by (the vendor's own `error.status` / `error.message`), not the bare status
code.

Nothing in this app calls that endpoint for its own sake: it is out-of-band context for whoever is
diagnosing a failure.

### Do we have quota left?

**No headroom endpoint or quota response headers exist.** Checked live (2026-08-16): neither an
unauthenticated nor a bad-key request to `/v1beta/models` returns anything resembling
`x-ratelimit-*` or `x-goog-quota-*` headers, and the discovery document lists no `quota` or `usage`
resource. Rate limits (requests/tokens per minute, requests per day — by model and by tier) are
documented figures at <https://ai.google.dev/gemini-api/docs/rate-limits>, visible only in the AI
Studio console, not observable through the API itself.

Declared as an honest absence (`health/quota.ts`).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | _declared absent — no vendor status feed covers this product_ |
| `quota` | quota | connection | signed | informational | _declared absent — no headroom endpoint or headers_ |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

Both declared absences carry `severity: "informational"` — an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so anything less would pin this app's verdict
at `unknown` forever.

## Actions

- **Generate Content** (`generate-content`) — `POST /v1beta/{model}:generateContent`
- **Count Tokens** (`count-tokens`) — `POST /v1beta/{model}:countTokens`
- **Embed Content** (`embed-content`) — `POST /v1beta/{model}:embedContent`
- **Batch Embed Content** (`batch-embed-contents`) — `POST /v1beta/{model}:batchEmbedContents`
- **List Models** (`list-models`) — `GET /v1beta/models`
- **Get Model** (`get-model`) — `GET /v1beta/{name}`

## Icon

`assets/icon.svg` — Google's own Gemini sparkle mark, downloaded verbatim from
`https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg`.

- **1,144 bytes**, `image/svg+xml`, 28×28 viewBox
- single radial-gradient path (purple → blue → cyan) — no flat single-colour fill, so it reads on
  both the light and dark app tiles without a separate dark-mode variant

---

Researched and endpoint-verified 2026-08-16 against the live `$discovery/rest` document. Re-verify
against the same document if a probe starts failing for everyone at once — Google occasionally
revises these APIs without a version bump.
