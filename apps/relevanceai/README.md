# Relevance AI

Relevance AI is an agent-building platform — you compose **Agents** (and the **Tools** they call) in
its UI, then drive them from anywhere. This app drives them from w6w: trigger an agent with a
message, run a tool and read its output, poll and cancel long-running jobs, and list what exists.

**It covers the vendor's own supported surface, which is smaller than its API.** Relevance AI's docs
state it plainly:

> The Relevance AI API is officially supported only for triggering Agents and Tools. All other usage
> is currently unsupported.

That sentence is the scope of this app, and the reason it ships 12 actions against a 527-path API.
See [Deliberately not covered](#deliberately-not-covered).

Every path, verb, query parameter, body field and enum here was verified on **2026-09-22** against
Relevance AI's live, vendor-served OpenAPI document —
`GET https://api-f1db6c.stack.tryrelevance.com/latest/openapi_schema.json`, 11,792,917 bytes,
`openapi: 3.0.0`, `info.title "Relevance AI Endpoints"`, 527 paths, discovered from the region host's
own Scalar `/latest/documentation` shell — plus live HTTP probes against the same host and against
`status.relevanceai.com`.

`relevanceai.com/docs/api-reference/*` is **deliberately unused**: those rendered pages are
Mintlify's unfilled template (Lorem ipsum, a sample `api.mintlify.com` host, byte-identical to
Mintlify's own stock example content). Nothing in this app came from a third-party integration
directory.

## The four things most likely to go wrong

### 1. There is no API host — the region id is half the credential

The OpenAPI document declares exactly one server, `{"url": "/latest"}`, with no hostname in it. Every
request goes to a **per-organization region host**:

```
https://api-<region_id>.stack.tryrelevance.com/latest/<path>
```

`<region_id>` is a short hex id the user reads off their own **Integrations & API Keys** page — the
vendor's own core-concepts page spells out the format and an example (`f1db6c`). Three region ids are
named as canonical in the vendor's enterprise docs (AU `f1db6c`, EU `d7b62b`, US `bcbe5a`), but the
live schema's own `region` enum on `TriggerAgentInput.agent_override.origin.region` lists **ten** —
so nothing here hardcodes a host. The region id is collected as a Connection field, exactly as
Zendesk collects its `subdomain`, and the manifest allowlists the wildcard
`*.stack.tryrelevance.com`.

A mistyped region id is the likeliest way for a Connection to fail, which is why `health/host.ts`
exists as a separate check: without it, a bad region id and a bad key both surface as "Relevance AI
rejected the key".

### 2. A wrong key answers **400**, not 401

Measured live against `api-f1db6c.stack.tryrelevance.com/latest/auth/info`:

| request                     | status   | body                                                                                                          |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| no `Authorization` header   | **401**  | `{"message":"Authorization header cannot be missing or empty","error_type":"authorization_header_missing"}`   |
| well-formed but wrong key   | **400**  | `{"message":"User key with id … not found in Postgres","error_type":"unset_error_type"}`                      |
| a live key                  | 200      | `GetAuthHeaderInfoOutput`                                                                                     |

So the auth probe **classifies from the body, never from the status code**: success is "the body
carries `user_id` and `key_id`", failure is "the body carries an `error_type`/`message`" — whatever
the HTTP status happens to be. A status-code check would read that 400 as "some other server
problem" and let a dead credential through.

### 3. A "Tool" in the product is a `studio` in the API

Every path is `/studios/**`. The vendor's own product documentation calls the same object a Tool
(`get-started/core-concepts/tools.mdx`), so the user-facing labels here say Tool while the paths and
body fields keep the API's spelling. `tool-get` answers "what does this tool need?" from its
definition, because `params` is free-form per tool.

### 4. `tool-job-cancel` takes the **job** id where its siblings take the tool id

The vendor's path is `/studios/{job_id}/cancel` — not `{studio_id}`, and not a typo on this app's part.
Both ids match the same `^[a-zd._-]+$` pattern, so a tool id sent there looks valid and cancels
nothing. The param is labelled Job ID and points at `tool-trigger-async`.

## Auth

One method, `api-token`, with two fields:

| Field      | Type     | Notes                                                                             |
| ---------- | -------- | --------------------------------------------------------------------------------- |
| `regionId` | string   | From Integrations & API Keys — a short id like `f1db6c`, not a URL.                |
| `apiKey`   | secret   | The key, copied whole: it is already `project_id:secret` as one opaque string.     |

The security scheme is the schema's own: `AuthorizationHeader` = `{"type":"apiKey","in":"header",
"name":"Authorization"}`, described as "Header authorization should be in the form of:
project:api_key". The key is sent **verbatim** — no `Bearer` prefix (two narrative pages show
`Bearer :<key>` and `Authorization: <project_id>:<api_key>` inconsistently; the OpenAPI security
scheme's explicit description wins over both), and `sign` is the only hook that ever sees it.

`afterConnect` calls the same `GET /auth/info`, records the region id and the caller's name on the
connection's redacted `display` (which is where the client reads the host from), and then drops the
rest. `permissions` goes through as-is — it is a project/organization role map, not a credential.

**The probe carries nothing secret back**: `GetAuthHeaderInfoOutput` is `user_id`, `key_id`, `email`,
`first_name`, `last_name`, `company`, `role`, `label`, `notes`, `tags`, `profile_picture_url`,
`onboarded` and `permissions`. A test asserts no field of the live shape is credential-shaped, so
that claim fails loudly if the vendor ever adds one.

## Actions

12 actions. `resource` groups them in the editor.

### Agents

| Key                | Type    | Endpoint                                | Notes                                              |
| ------------------ | ------- | --------------------------------------- | -------------------------------------------------- |
| `agent-trigger`    | perform | `POST /agents/trigger`                  | `agent_id`, `message {role, content}`, `conversation_id` |
| `agent-get`        | read    | `GET /agents/{agent_id}/get`            | optional `version`                                  |
| `agent-list`       | read    | `POST /agents/list`                     | `query`, `filters`, `page`, `page_size`, `sort`     |
| `agent-run-cancel` | perform | `POST /agents/{agent_id}/cancel`        | empty body, empty response                          |
| `conversation-list`| read    | `GET /agents/conversations/list`        | `query`, `page`, `page_size`                        |

### Tools (`studios`)

| Key                  | Type    | Endpoint                                       | Notes                                        |
| -------------------- | ------- | ---------------------------------------------- | -------------------------------------------- |
| `tool-trigger`       | perform | `POST /studios/{studio_id}/trigger`            | `params`, `tool_version`, `max_job_duration` |
| `tool-trigger-async` | perform | `POST /studios/{studio_id}/trigger_async`      | returns `{job_id, project, studio_id}`       |
| `tool-job-poll`      | read    | `GET /studios/{studio_id}/async_poll/{job_id}` | `after_message_id`, `page_size`              |
| `tool-job-cancel`    | perform | `POST /studios/{job_id}/cancel`                | the **job** id; empty body                   |
| `tool-get`           | read    | `GET /studios/{studio_id}/get`                 | optional `tool_version`                      |
| `tool-list`          | read    | `GET /studios/list`                            | `query`, `filters`, `page`, `page_size`, `sort` |

### Identity

| Key             | Type | Endpoint         | Notes                                                             |
| --------------- | ---- | ---------------- | ----------------------------------------------------------------- |
| `auth-info-get` | read | `GET /auth/info` | which project/user/key this Connection is; no credential comes back |

### Idempotency

**Relevance AI's trigger endpoints accept no idempotency key**, so `agent-trigger`, `tool-trigger`
and `tool-trigger-async` are all `idempotent: false`: a retry starts a second run and bills for it.
(`external_id` on the agent trigger is not a candidate — it names a conversation in the caller's own
system and *extends* that conversation rather than deduplicating the request.)

`agent-run-cancel` and `tool-job-cancel` are `idempotent: true`. Cancelling something already
cancelled is not a second side effect, and saying so is what lets the runtime recover from a dropped
connection instead of failing the step. Both endpoints declare empty inputs and empty outputs in the
schema, so each action reports a single `{ "cancelled": true }` rather than inventing fields.

### Notes on individual actions

- **`agent-trigger` returns a job receipt, not an answer.** `TriggerAgentOutput` is `{job_info,
  conversation_id, agent_id, state, queued_mid_run?}` — the agent's reply is produced
  asynchronously and read back from the conversation (`conversation-list`). `role` is fixed to
  `"user"`: the schema's other message branches require an `action`/`action_request_id` pair, which
  is the internal resume-a-tool-call protocol.
- **`tool-trigger` can come back `inprogress`.** `TriggerStudioOutput.status` is
  `complete | inprogress | failed | cancelled`; a tool that needs longer than the request's budget
  returns no output at all. That is the case `tool-trigger-async` + `tool-job-poll` exist for.
- **`tool-job-poll`'s `timeout` is not a failure.** `StudioAsyncPollOutput.type` is
  `timeout | inprogress | complete | failed`, and `timeout` means "nothing new within the server's
  budget — ask again". Pass the previous `last_message_id` back as `afterMessageId` so each poll
  fetches only what is new instead of the job's whole history.
- **`agent-list` is a POST and `tool-list` is a GET.** The two list routes do not share a method
  even though they share their `query`/`page`/`page_size`/`sort`/`filters` vocabulary; there is no
  `GET /agents` at all in the 527-path document.
- **`filters`/`sort` are JSON, deliberately.** The vendor's filter object is `{field, filter_type,
  condition, condition_value, case_insensitive}` with an eleven-member `filter_type` enum whose
  `or`/`and` members nest further filters — a flat form cannot express it.
- **Page sizes are prefilled and that is this app's choice.** The schema declares no default for
  `page_size`; a workflow step silently handed a thousand agents is a footgun, so every list
  prefills a small page and says so. Raise it explicitly.
- **`agent-get` / `tool-get` pass the whole resource through** (`{agent: {...}}` with 79 properties,
  `{studio: {...}}` with 42) rather than transcribing fields the vendor owns and will change.
- **`agent-list` does not expose `include_public_agents`** — the live schema documents it as
  "DEPRECATED: this parameter had no effect and is now ignored".
- **`conversation-list` exposes 3 of its 14 parameters.** The flags it leaves out
  (`include_debug_info`, `mask_pii`, `exclude_fields`, …) change what is *inside* each row rather
  than which rows come back: that is debugging a view, not driving an integration.

## Health checks

Three declared checks plus the derived `auth:api-token` (projected automatically from `test`).

### `service` — the status page is real, and its verdict is scoped to three components

`status.relevanceai.com` is a genuine **Better Stack** page, verified 2026-09-22. `GET /index.json`
returns 109,987 bytes of JSON:API whose own payload self-identifies:

```json
"company_name": "Relevance AI",
"company_url": "https://relevanceai.com",
"custom_domain": "status.relevanceai.com",
"subdomain": "relevanceai",
"aggregate_state": "operational"
```

Its 31 resources span four unrelated sections — `Application` (Agent Builder, Chat), `LLM providers`
(Anthropic, OpenAI), `Third party providers` (WorkOS, Serper, Modal, Orb Billing, Pipedream) and
**`API Gateways`**: `AU API` (id 8541218), `EU API` (8541219), `US API` (8559600).

Three consequences for the code:

- **The check matches `public_name` against `/ API$/`** — exactly those three, and nothing else.
  `Orb Billing` is the trap a substring match on the vendor's name would spring; `Agent Builder` and
  `Chat` describe surfaces this app does not call.
- **The page-wide `aggregate_state` is not the verdict.** It rolls up all 31 resources, so an OpenAI
  outage would be reported as a Relevance AI API problem. The state here is derived from the three
  `API Gateways` components' worst state. This is the one deliberate divergence from
  `apps/raindrop/health/service.ts`, whose aggregate really did cover only its own five resources.
- **All three regions are checked, not one.** This app has no idea which region a Connection is on,
  so the question it can honestly answer is "is any API gateway degraded?"; the per-connection
  question is `host`'s.

A page that stops self-identifying as Relevance AI's, or that exposes no `* API` components at all,
reports `unknown` — never `ok`, and never `down`.

### `host` — is this connection's region host answering?

A `kind: "dependency"`, `scope: "connection"`, `credential: "context"` check that is **deliberately
unauthenticated**: `GET /latest/auth/info` with no header answers `401
authorization_header_missing` on a live host, which proves DNS, TLS and the vendor's API are all
answering. A 401 is a pass. Only a transport failure, a 404 (a region id belonging to no gateway) or
a 5xx counts as down.

It exists to keep one diagnosis from masquerading as another: without it, a mistyped region id fails
through the `auth:*` check as "Relevance AI rejected the key". The region id is the one value no
vendor lookup can complete for the user.

### ~~`quota`~~ — a declared absence, at `informational` severity

No supported Relevance AI endpoint reports a remaining budget:

- Nothing on the agent/tool surface returns an `X-RateLimit-*`, `RateLimit-*` or `Retry-After`
  header — measured across `GET /auth/info`, `GET /studios/list`,
  `GET /agents/conversations/list`, `POST /agents/list` and `POST /studios/{id}/trigger`.
- The only object in the whole 527-path schema that pairs a ceiling with consumption is
  `GetOrganizationUsageOutput` = `{usage, limit}`, behind
  `GET /organizations/{organization_id}/usage/get` — organization management, which the vendor
  marks unsupported and this app deliberately does not cover.
- Credits do exist, but only *after* the fact and only per run:
  `TriggerStudioOutput.credits_used` and `.cost`. `GET /studios/list/usage` answers
  `ListStudioUsageAggregationOutput` = `{results: [...]}` — per-tool aggregates with no limit on
  them.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
`unknown` outranks `ok` in the roll-up, and at any other severity this declared absence would pin
the app's verdict at `unknown` forever.

## Deliberately not covered

The vendor's OpenAPI document has **527 paths** covering its entire internal product. This app
implements **12**, all of them inside "triggering Agents and Tools". Everything below was read in
that document and left out on purpose — because the vendor's own documentation says the API is "not
officially supported" outside agent and tool triggering, not because any detail could not be
confirmed:

- **Datasets and knowledge sets** — the retrieval layer behind agents. Real, internal, and outside
  the supported surface.
- **Billing** (`/billing/**`, `/organizations/{id}/billing/**`, the Orb integration, credit
  purchase and auto-recharge) — a finance surface, not an automation one.
- **Marketplace listings** — publishing and installing agents/tools in the vendor's store.
- **Organization, project and user management** (`/organizations/**`, `/auth/users/**`,
  `/auth/invite/**`, `/projects/**` including the usage alarms) — SCIM-style administration, run by
  a directory rather than by a workflow.
- **OAuth account linking** (Slack, Teams, Pipedream, Twitter), the Slack/Teams account surfaces,
  and the OAuth apps their tokens belong to.
- **`fs/metadata`** and the file-system shims.
- **Tool-step introspection** — reading one step's intermediate state out of a running tool.
- **Workforce endpoints** — the vendor's newer "AI workforce" objects.
- **Evals** (`/evals/**`, batch eval runs, credit breakdowns) and **analytics** (`/analytics/**`,
  usage-by-model breakdowns).
- **Scheduled triggers and sync items** — scheduling belongs to the workflow engine on this side of
  the connection.
- **The meeting / recall.ai integration** (`/chats/**`, meeting bots).
- **`GET /studios/list/usage`** — per-tool usage aggregates. The nearest thing to headroom this app's
  own surface offers, and still not a balance: see the `quota` check.
- **The `executor` / `studio_override` / `orchestrator` trigger bodies** — they reconfigure a tool's
  runtime rather than calling it, and belong to the vendor's UI.

Nothing was dropped because a detail could not be confirmed: all 12 shipped actions were verified
against the live schema *and* probed unauthenticated (a real route answers the vendor's JSON error
envelope; a nonexistent one answers Express's HTML `Cannot GET/POST …`).

## Icon

`assets/icon.png` is Relevance AI's own mark, downloaded **verbatim** from
`https://cdn.relevanceai.com/images/favicon-256x256.png` on 2026-09-22 — HTTP 200, `image/png`,
**3,874 bytes**, md5 `bdc359b02ae429fd4b118491e2cf04bf`, a 256×256 8-bit RGBA PNG. That URL is the
mark relevanceai.com serves from its own `<link rel="apple-touch-icon">` tag. It is declared through
`appearance.icon.url` (not `svg`), the same way `apps/acuityscheduling/` and `apps/assemblyai/`
declare their raster marks.

It is byte-identical to the download and is **not touched by `deno task fmt`**, whose file list names
only the `.ts` directories — never bare `deno fmt`, which rewrites `assets/icon.*` and would falsify
this claim. A test asserts the byte length, the PNG signature, the 256×256 IHDR and the RGBA colour
type, so a redraw or a re-encode fails the suite. The mark passes the pack's icon-legibility audit on
both tiles (`_tools/icon-legibility.ts`) with no `appearance.darkMode.icon` needed.

## Layout

```
relevanceai/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # region host, RelevanceAiClient, error formatting, whoami typing
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # API key + region id: sign, test, afterConnect
├── actions/                     # one file per action (12)
├── health/
│   ├── service.ts               # status.relevanceai.com, scoped to the three * API components
│   ├── host.ts                  # this connection's region host, unsigned
│   └── quota.ts                 # declared absence, informational
├── assets/icon.png              # vendor mark, verbatim
└── tests/                       # 109 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly; without it, `_tools/audit.ts` picks up
`_tools/deno.json` as its configuration and cannot resolve the `@w6w/types` value import — the same
quirk `apps/apify/` documents.
