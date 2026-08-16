# Perplexity

Web-grounded chat completions (both the current Agent API and the retiring Sonar surface),
standalone web search, and text embeddings via the Perplexity API.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 5
- **Egress allowlist** — `api.perplexity.ai`
- **Website** — https://www.perplexity.ai
- **API docs** — https://docs.perplexity.ai

## Read this before building anything else on Sonar

Perplexity's platform, as of 2026-08-16, is organized into several distinct products that
share one API key and one host (`api.perplexity.ai`) but are otherwise independent:

- **Agent API** (`POST /v1/agent`) — the current, documented-as-primary chat surface:
  multi-provider models, optional tool use (web search among them), OpenAI-Responses-shaped
  output. The `agent-response` action below. **Use this for new work.**
- **Sonar Chat Completions** (`POST /v1/sonar`, alias `POST /chat/completions`) — the
  `chat-completion` action below. Retiring — see the next section.
- **Search API** (`POST /search`) — the `web-search` action below.
- **Embeddings API** (`POST /v1/embeddings`, plus a contextualized-embeddings variant) —
  the `create-embeddings` action below.
- **Router API** (`/router/v1/models` and friends) — an OpenAI-Chat-Completions-compatible
  gateway to open-weight third-party models. Not modeled by this app.

**Sonar Chat Completions is being retired.** The live docs page for this exact operation
carries a standing banner (captured verbatim, 2026-08-16):

> Sonar Chat Completions is now Agent API. Sonar will be supported until September 27,
> 2026.

This app was first built with only the Sonar action, targeting the OpenAI-shaped,
search-augmented chat-completions surface the original task described — that is
unambiguously Sonar. Once the retirement date surfaced, the documented successor,
`POST /v1/agent`, was added as its own `agent-response` action (see "Migrating from Sonar
to the Agent API" below) rather than deleting or silently reshaping `chat-completion`:
existing callers of the Sonar action keep working unchanged until 2026-09-27, and new work
should start on `agent-response`. Both actions name each other in their `description` (and
`chat-completion`'s title is suffixed `(Sonar — retiring 2026-09-27)`), so either one
surfaces the other directly in the Studio action picker, without opening this file.

The async variants of Sonar (`POST /v1/async/sonar`, `GET /v1/async/sonar/{id}`) carry the
identical deprecation notice and are left out of this app entirely rather than built against
a sunsetting surface — see "Left out" below. The Agent API has its own, separate background
mode (`background: true` on `/v1/agent`, polled via `GET /v1/agent/{id}`), also left out —
see "Left out".

The Search and Embeddings APIs are **not** part of this deprecation; they are current,
separately-versioned products and are safe to build on.

## Migrating from Sonar to the Agent API

Verified against `docs/agent-api/quickstart.md`, `docs/agent-api/tools/web-search.md`,
`docs/agent-api/presets.md`, and the OpenAPI schemas for `ResponsesRequest` /
`ResponsesResponse` / `WebSearchTool` (all fetched 2026-08-16) — read directly against the
Agent API's own reference, not inferred from Sonar's shape.

| | `chat-completion` (Sonar) | `agent-response` (Agent API) |
|---|---|---|
| Endpoint | `POST /v1/sonar` | `POST /v1/agent` |
| Model | Perplexity-only: `sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research` | Multi-provider `provider/model` ids (`openai/gpt-5.6-sol`, `anthropic/claude-sonnet-4-6`, Perplexity's own, ...), or a `preset` (`fast`/`low`/`medium`/`high`/`xhigh`/`wide-research`) that bundles a model + config |
| Prompt in | `messages: [{role, content}]` | `input`: a plain string, or a structured array for multi-turn/tool-result input |
| Web search | Always on unless `disable_search` | Opt-in: only runs when a `web_search` tool is present in `tools` **and** the model decides to call it |
| Search filters | Top-level `search_domain_filter` / `search_recency_filter` / date filters | Same field names, nested under `tools[0].filters` |
| Answer text | `choices[0].message.content` | An `output[]` item with `type: "message"`, `content[0].text` |
| Search results | Top-level `search_results[]` | An `output[]` item with `type: "search_results"`, emitted before the message item — same fields (`id`, `url`, `title`, `snippet`, `date`, `last_updated`, `source`) |
| Citations | Always returned: top-level `citations: string[]` | **Not automatic.** Inline citation markers only appear if the prompt asks for them — every `preset` but `wide-research` bundles a system prompt that does this; calling with a bare `model` does not. `agent-response` defaults `preset` to `low` for exactly this reason. Either way, `search_results[].id` / `.url` is the vendor-documented source of truth |
| Structured output | `response_format: {type: "json_object" \| "text"}` | `response_format: {type: "json_schema", json_schema: {...}}` — no `json_object` shorthand |
| Usage/cost | `usage: {prompt_tokens, completion_tokens, total_tokens, ...}` | `usage: {input_tokens, output_tokens, total_tokens, cost: {...}}` — carries a cost breakdown Sonar does not |

**Which to pick today:** `agent-response`, unless you have an existing integration already
parsing Sonar's `choices[]`/`citations[]` shape and don't want to touch it before
2026-09-27. **After 2026-09-27:** only `agent-response` will work — `chat-completion` will
start failing outright once Sonar is switched off.

The Agent API is not missing anything Sonar has for search: every Sonar filter
(`chat-completion.ts`'s param list) has a verified one-to-one Agent API equivalent
(`agent-response.ts`'s param list), and the search-result fields match exactly. The one
genuine behavior change is citations moving from "always on" to "on by default only via a
preset's system prompt" — documented above, not papered over.

## Findings that would have cost a day

1. **The OpenAPI spec's canonical path for chat completions is `/v1/sonar`, not
   `/chat/completions`.** The docs *page* lives at the URL slug
   `api-reference/chat-completions-post` and the older `/chat/completions` path still
   answers identically live — but the OpenAPI document served from that same page declares
   `post /v1/sonar` as the operation, and the docs prose refers to "sonar" 202 times against
   one incidental mention of "chat/completions". This app calls `/v1/sonar`.
2. **`GET /v1/models` is documented `security: []` (no auth required) but the live API
   401s it exactly like every other endpoint**, unauthenticated or with a bogus key alike
   — measured 2026-08-16: both come back
   `{"error":{"message":"Invalid API key provided...","type":"invalid_api_key","code":401}}`.
   A caller trusting the spec's `security: []` and skipping the auth header gets a
   confusing 401 from a route the docs say needs none. This is also what makes the route
   usable as this app's credential probe at all.
3. **`GET /v1/models` lists models for the *Agent API* (`POST /v1/agent`), not the Sonar
   chat-completion models.** It does not enumerate `sonar` / `sonar-pro` /
   `sonar-reasoning-pro` / `sonar-deep-research` — those are a small fixed enum in the
   OpenAPI schema, not a queryable catalog. Calling `list-models` expecting Sonar's model
   names back will find Claude/GPT/Gemini ids instead.
4. **Embeddings never return a plain float array.** `EmbeddingObject.embedding` is always a
   base64 **string** — `encoding_format` (default `base64_int8`) only chooses whether the
   packed bytes are signed int8-per-dimension or 1-bit-per-dimension binary. There is no
   "give me `number[]`" option, unlike OpenAI's or Mistral's embeddings endpoints. A caller
   assuming `response.data[].embedding` is already a numeric vector will silently misuse the
   base64 text as one. This action returns the API's response unmodified; decoding is left
   to the caller.
5. **`status.perplexity.ai` and `/api/v2/summary.json` both "work" and both mislead.** The
   apex redirects live to `status.perplexity.com` (an Instatus page, not the Atlassian
   Statuspage the pack defaults to guessing), and the Statuspage-style
   `/api/v2/summary.json` path also resolves there with `HTTP 200 application/json` — but
   its body is only `{"page":{"status":"UP"}}`, no `components`, no incidents. Trusting
   `page.status` alone would report "UP" straight through a real, open, identified
   incident, which is exactly the trap the pack's `manychat` app documents for the same
   platform (Instatus). The real per-component surface is `/v2/components.json`.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second
is something the app itself performs.

### Is the vendor up?

**Service status** — `status.perplexity.com` (Instatus), per-component JSON:

```
GET https://status.perplexity.com/v2/components.json
```

Verified as a real routed endpoint, not a catch-all: a bogus sibling path on the same host
(`GET /v2/bogus-sibling-xyz.json`) answers a Next.js 404 shell (`text/html`, 7001 bytes);
the real path answers `200 application/json`, 330 bytes (measured 2026-08-16). Three
components are published — `Website`, `API`, `Computer` (Perplexity's separate
browser-automation agent product) — and only `API` drives the check's `state`; the other
two are still reported under `components` for attribution, so a marketing-site or
Computer-product incident is never confused with a chat-completions/search/embeddings
outage.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /v1/models
```

Chosen because it needs no object-level scope (see finding 3 above — it is unrelated to
Sonar/Search/Embeddings entitlements) and its response carries no credential material, just
a model catalog. See finding 2 above for why an unauthenticated request to this
spec-labeled-public route still proves the credential, not just reachability.

### Do we have quota left?

Declared absent (`unavailable`, `severity: "informational"`). Checked live on
`/v1/sonar`, `/search`, `/v1/embeddings`, and `/v1/models`: none carries any
`x-ratelimit-*` header, and no response body reports a remaining balance. The only
usage-metering endpoints Perplexity documents
(`GET /v1/analytics/computer/usage`, `GET /v2/analytics/computer/usage`) require a
**separate organization analytics API key**, minted by an org admin, distinct from the
per-user key this app's `auth/api-key.ts` collects — and they meter the unrelated Computer
product's credit spend, not chat-completion/search/embeddings token usage.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed (n/a — unavailable) | informational | — | declared absent |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.perplexity.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

## Actions

| Key | Type | Endpoint | Notes |
|---|---|---|---|
| `agent-response` | perform | `POST /v1/agent` | **Sonar's successor — use for new work.** Multi-provider model/preset, optional `web_search` tool with the same filters as Sonar, OpenAI-Responses-shaped `output[]`. See "Migrating from Sonar" above. |
| `chat-completion` | perform | `POST /v1/sonar` | Sonar chat completion with search-specific params (domain/language/recency/date filters, search mode, related questions). Returns `citations` + `search_results` alongside `choices`. **Sunsetting 2026-09-27** — see above. |
| `web-search` | search | `POST /search` | Standalone ranked web search with extracted page content. Current product, not deprecated. |
| `create-embeddings` | perform | `POST /v1/embeddings` | Text embeddings. Response vectors are base64-encoded, never plain floats — see finding 4. |
| `list-models` | read | `GET /v1/models` | Agent API model catalog — see finding 3. Does not list Sonar model names. |

### Model names

`chat-completion`'s `model` param is free text (default `sonar`), not a `select`, even
though the OpenAPI spec currently publishes a fixed enum (`sonar`, `sonar-pro`,
`sonar-reasoning-pro`, `sonar-deep-research`) — the whole surface is sunsetting within
weeks of this app being written, and pinning a dropdown to that particular list serves
nobody. Same for `create-embeddings`'s `model` param (`pplx-embed-v1-0.6b` /
`pplx-embed-v1-4b`) and `agent-response`'s `model` param (free text, `provider/model`,
because the provider catalog is large and changes independently of this app). **All three
hints need periodic refresh** against `https://docs.perplexity.ai/openapi.json` /
`docs/agent-api/models.md` if the vendor changes a catalog. `agent-response`'s `preset`
field, by contrast, *is* a `select` — presets are a small, stable, named set
(`fast`/`low`/`medium`/`high`/`xhigh`/`wide-research`) that the vendor explicitly documents
as the stable public API (`docs/agent-api/presets.md`: "the name stays the same" across
config updates).

### Left out

- **Agent API background mode** (`background: true` on `POST /v1/agent`, polling via
  `GET /v1/agent/{id}`, cancel via `POST /v1/agent/{id}/cancel`, file retrieval via
  `GET /v1/agent/{id}/files`) — `agent-response` only models the synchronous path. Polling
  needs a second action with its own shape (an id in, a status/result out) and a decision
  about how this pack's action model represents "check back later"; left for a follow-up
  rather than bolted on.
- **Agent API tools beyond `web_search`** (`finance_search`, `people_search`, `fetch_url`,
  `sandbox`, `mcp`, custom `function` tools) — `agent-response` wires up only `web_search`,
  the one Sonar-equivalent capability this app was asked to preserve. The others are
  documented, real, and out of scope for this pass.
- **Agent API multi-turn structured input beyond `previous_response_id`** — `input` accepts
  a raw array of Agent API input items (assistant/user/system/developer messages,
  function-call/function-call-output pairs) verbatim; this action does not validate or help
  construct that array, only passes it through.
- **Async Sonar completions** (`POST /v1/async/sonar`, `GET /v1/async/sonar`,
  `GET /v1/async/sonar/{id}`) — carry the identical Sonar deprecation notice as
  `chat-completion`; not worth building against a surface with a six-week runway at time of
  writing.
- **Contextualized Embeddings** (`POST /v1/contextualizedembeddings`) — a document-chunk
  variant of embeddings for retrieval over multi-chunk documents; left out for scope, the
  request shape (chunks grouped by document, each with surrounding context) is
  meaningfully different from the standard embeddings action and deserves its own action
  rather than an overloaded one.
- **Router API** (`/router/v1/models`, OpenAI-compatible gateway to third-party open-weight
  models under one key) — a distinct product from the Perplexity-authored Sonar/Search/
  Embeddings/Agent surfaces above; out of scope for this app.
- **Streaming** (`stream: true` on `/v1/sonar` and `/v1/agent`) — out of scope per this
  app's build instructions; every action always requests the fully-materialized response.
- **`user_location`** on `chat-completion`'s and `agent-response`'s web-search config — a
  nested lat/long/country/region/city object for search personalization; left out of both
  actions' params for scope.

## Icon

`assets/icon.svg` — the vendor's mark, verbatim from simple-icons
(`cdn.simpleicons.org/perplexity`), 633 bytes, 24×24 viewBox, fill `#1FB8CD`. Placed before
this app was built; not modified, replaced, or re-normalized onto the pack's usual 100×100
canvas.

---

Researched and endpoint-verified 2026-08-16 against `https://docs.perplexity.ai/openapi.json`
and live probes on `api.perplexity.ai` / `status.perplexity.com`. Status surfaces and the
Sonar-to-Agent-API migration timeline both move; re-check before relying on either.
