# Linkup

Web search and fetch for LLMs and agents: ranked sources, sourced answers, schema-shaped JSON,
page-to-markdown fetch, a research agent, batch tasks, and past-day "rewind" search. Vendor docs:
<https://docs.linkup.so>; OpenAPI: <https://api.linkup.so/v1/openapi.json>. This is linkup.so, not
"LinkupAPI" (a different, LinkedIn-focused product).

Category: **AI**, **Search**, **Developer Tools**.

## Connecting

Create an API key in the Linkup dashboard (<https://app.linkup.so>) and paste it into the
connection. It is sent as `Authorization: Bearer <key>` by the connection's `sign` hook; no action
ever sees it. Every call is billed in credits.

## Actions

| Action | Route | Notes |
| --- | --- | --- |
| `search` | `POST /v1/search` | Any depth (`flash`, `fast`, `standard`, `deep`) and output type |
| `search-results` | `POST /v1/search` | `outputType: searchResults`. Returns `results` (name, url, content snippet) |
| `search-answer` | `POST /v1/search` | `outputType: sourcedAnswer`. Returns `answer` and `sources`; optional inline citations |
| `search-structured` | `POST /v1/search` | `outputType: structured`. Returns `data` matching your schema; optional `sources` |
| `fetch` | `POST /v1/fetch` | One page as markdown; `renderJs`, `mode: pro`, raw content, images, schema + instructions |
| `credits-balance` | `GET /v1/credits/balance` | Credits remaining |
| `tasks-create` | `POST /v1/tasks` | 1 to 100 `{type, input}` search/fetch/research/extract tasks |
| `tasks-list` | `GET /v1/tasks` | Filter by type and status; pagination; returns the in-flight quota |
| `tasks-get` | `GET /v1/tasks/:id` | Poll one task |
| `research-create` | `POST /v1/research` | Async research agent; `mode`, `reasoningDepth` (S/M/L/XL) |
| `research-list` | `GET /v1/research` | Paginated |
| `research-get` | `GET /v1/research/:id` | Poll one research task |
| `extract-create` | `POST /v1/extract` | **Beta, closed.** Page to rows, NDJSON download (403 unless enabled) |
| `extract-list` | `GET /v1/extract` | Beta. Paginated |
| `extract-get` | `GET /v1/extract/:id` | Beta. `output.resultUrl` is valid 24 hours |
| `rewind-search` | `POST /v1/rewind/search` | **Beta.** Search the web as of the end of a UTC day |
| `rewind-fetch` | `POST /v1/rewind/fetch` | **Beta.** A page as of a UTC day; URL must match the stored one exactly |
| `create-response` | `POST /v1/responses` | OpenAI Responses-compatible proxy (`linkup-standard`, `linkup-deep`) |

The search actions share one normalised result: `outputType` plus `results`, or `answer` +
`sources`, or `data` (+ `sources`). The three variants exist so a workflow form shows only the
fields that apply to its output type.

All 18 actions were verified against the OpenAPI document. Left out: nothing documented. Server-side
streaming and the MCP server (`mcp.linkup.so`) are not part of the REST API and are not covered.

## Things worth knowing

- **Two schema encodings.** `structuredOutputSchema` (search, research) is a JSON Schema serialised
  **as a string**; `schema` (fetch, extract) is a JSON **object**. The actions accept either form
  in the field and send the one the endpoint wants.
- **No key is a 402 on search and fetch, a 401 elsewhere.** Without a key `/search` and `/fetch`
  answer `402` with x402 pay-per-request details; every other route answers `401`. The connection
  test and health probes therefore use `/v1/credits/balance`, which is free.
- **429 is two things.** "Out of credits" and "over 10 queries per second per organisation" share the
  status and the body does not say which.
- **Errors are one shape** whatever the status: `{statusCode, error: {code, message, details[]}}`.
  Health and auth decisions read `error.code`, not the status.
- **Research, extract and tasks are asynchronous**: they answer an id; poll the matching `-get`
  action (research takes 2 to 20 minutes).

## Health

| Check | Kind | How |
| --- | --- | --- |
| `service` | service | `status.linkup.so` is an OpenStatus page. Its RSS/Atom feeds carry only maintenance notices with no resolved marker, so the check reads `GET /feed/json` instead and judges the **Search API** and **Fetch API** monitors (`success` ok, `degraded`/`info` degraded, `error` down). The dashboard and MCP server monitors are detail only. A page that no longer names both API monitors is `unknown`. |
| `api` | dependency | Unsigned `GET /v1/credits/balance`. The JSON `UNAUTHORIZED` refusal is a pass, a 5xx is `down`. |
| `quota` | quota | `GET /v1/credits/balance` as `remaining` credits (`down` at zero). Informational. Linkup publishes no plan limit, so none is reported. |
| `auth:api-key` | derived | The auth `test` hook, which needs a numeric `balance` in the body. |

## Icon

`assets/icon.svg` is the vendor's mark, byte-for-byte from <https://docs.linkup.so/favicon.svg>.
