# Google Vertex AI

Gemini, embeddings, models, endpoints and batch prediction on Google Vertex AI,
through a Google Cloud project and its IAM — not an API key.

- **Categories** — ai, devops
- **Auth methods** — oauth2, service-account
- **Actions** — 14
- **Egress allowlist** — `aiplatform.googleapis.com` plus 45 exact regional hosts
  `{region}-aiplatform.googleapis.com` (see below)
- **Website** — https://cloud.google.com/vertex-ai
- **API docs** — https://cloud.google.com/vertex-ai/docs/reference/rest ·
  schema: `https://aiplatform.googleapis.com/$discovery/rest?version=v1`
  (discovery document served by the API's own host, revision 20260930)

The `gemini` app in this pack calls the Gemini Developer API with an API key.
This app is the Vertex AI surface: calls are billed to a GCP project, authorised
by IAM, and served from a region you choose.

## Setup

Enable the **Vertex AI API** (`aiplatform.googleapis.com`) on a Google Cloud
project, and give the identity you connect with a Vertex AI role such as
`roles/aiplatform.user`. A connection carries a **Project ID** and a **default
location**; every action can override either.

### OAuth (Sign in with Google)

Configure OAuth client credentials for this w6w installation, then connect. The
single scope is `.../auth/cloud-platform` (the discovery document lists
`aiplatform` too, but `batchPredictionJobs.*` accepts `cloud-platform` only).
`access_type=offline` + `prompt=consent` are set so Google returns a refresh token.

### Service account

Paste the `client_email` and `private_key` from a downloaded JSON key. Each
request signs an RS256 JWT, exchanges it at `oauth2.googleapis.com/token` for a
`cloud-platform` access token, and sends it as a Bearer (the same flow as
`google-sheets`' service-account method; the token is re-minted per request
because the sandbox has no per-credential cache).

## Locations and the egress allowlist

A call to `locations/{l}` must go to `{l}-aiplatform.googleapis.com` (`global`
goes to `aiplatform.googleapis.com`). The manifest validator accepts exact
hostnames and `*.domain` wildcards only (`packages/runtime/src/runtime.ts`), so
`*-aiplatform.googleapis.com` is not expressible and `*.googleapis.com` would
open every Google API. The allowlist is therefore the exact list of locational
endpoints in the discovery document's `endpoints` array — 45 regions, plus
`global` — in `lib/regions.ts`. The Location field on the connection and on every
action is a select over that list, the client refuses anything else, and a test
keeps `package.json` in step with it.

A full resource name (`projects/p/locations/europe-west4/endpoints/123`, as list
results return) carries its own project and location; the call goes to that
region's host regardless of the connection's default.

## Actions

| Key | Type | Description |
|---|---|---|
| `generate-content` | perform | Gemini `generateContent` on a publisher model; adds a plain `text` field |
| `count-tokens` | read | `countTokens` for a prompt, without generating |
| `embed-content` | perform | `embedContent` on an embedding model (one text → one vector) |
| `predict-publisher-model` | perform | `predict` on a publisher model, e.g. `text-embedding-005` or Imagen |
| `get-publisher-model` | read | Model Garden metadata for `publishers/{p}/models/{m}` |
| `list-models` | read | Models in the project's Model Registry |
| `get-model` | read | One registry model |
| `list-endpoints` | read | Endpoints in a location |
| `get-endpoint` | read | One endpoint, with its deployed models and traffic split |
| `predict-endpoint` | perform | `predict` against a deployed endpoint |
| `batch-prediction-job-create` | perform | Start a batch job over Cloud Storage or BigQuery |
| `batch-prediction-job-get` | read | State, completion stats, output location |
| `batch-prediction-job-list` | read | List batch jobs, optionally filtered |
| `batch-prediction-job-cancel` | perform | Ask Vertex to stop a job (asynchronous: CANCELLING → CANCELLED) |

Every path, verb, parameter and body field was checked against the discovery
document. Facts worth knowing:

- `embed-content` sends `embedContentConfig`; the top-level `taskType`, `title`,
  `outputDimensionality` and `autoTruncate` on that request are marked deprecated.
- `predict` instance shapes belong to the model, not the API, so `instances` and
  `parameters` pass through verbatim. The text-embedding example
  `[{ "content": "…" }]` comes from Google's model docs, not the discovery document.
- `get-publisher-model` is served from the global host: its path
  (`/v1/publishers/{p}/models/{m}`) has no project or location.
- Batch jobs read and write Cloud Storage / BigQuery as the Vertex AI service
  agent (or the `serviceAccount` you pass), not as the connection.
- Model ids in the form fields (`gemini-2.5-flash`, `gemini-embedding-001`,
  `text-embedding-005`) are defaults, not a verified catalogue; availability
  varies by region and changes.

## Health checks

`service` · ~~quota~~ · 1 derived (`auth:oauth2` / `auth:service-account`).

- `service` reads open incidents from the Google Cloud dashboard
  (`status.cloud.google.com/incidents.json`, unsigned), matching only the products
  this app calls: Vertex Gemini API, Online Prediction, Batch Prediction and Model
  Registry. `products.json` lists each under both a `title` and a renamed
  `current_title` ("… on Agent Platform"), so both are matched.
- `quota` is declared unavailable (`informational`): no rate-limit headers or
  headroom endpoint exist in the discovery document; exhaustion is a 429
  `RESOURCE_EXHAUSTED`.
- The credential probe is `GET /v1/projects/{p}/locations/{l}/endpoints?pageSize=1`.
  It returns the caller's own endpoints, never the credential. The verdict is read
  from Google's `error.status` and `ErrorInfo.reason` in the body
  (`UNAUTHENTICATED`, `PERMISSION_DENIED` + `SERVICE_DISABLED`, `NOT_FOUND`), not
  from the HTTP status.

## Not included

Streaming (`streamGenerateContent` — `ctx.fetch` returns one finished response),
partner-model `rawPredict`, `computeTokens`, `predictLongRunning`, the multi-region
`us` / `eu` endpoints (a different host family, `aiplatform.{us,eu}.rep.googleapis.com`),
dedicated-DNS endpoints, creating/deploying models and endpoints, tuning, pipelines,
Vector Search, caches, RAG and Agent Engine. A project-wide publisher-model *list*
is not in the v1 discovery document, so it is omitted.

## Icon

`assets/icon.svg` is the vendor's mark, byte-for-byte from
`https://www.gstatic.com/cloud/images/navigation/vertex-ai.svg`.
