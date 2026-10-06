# Tavily

Search the web, extract and crawl pages, map sites and run cited research reports on the **Tavily
REST API**, built for AI agents.

- **Categories** — ai, developer-tools
- **Auth methods** — api-key (`Authorization: Bearer tvly-...`)
- **Actions** — 7
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.tavily.com` (the `service` check adds `status.tavily.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.tavily.com/
- **API docs** — https://docs.tavily.com/documentation/api-reference/introduction (index at
  https://docs.tavily.com/llms.txt)
- **Status page** — https://status.tavily.com/

> Verified 2026-10-06 against the OpenAPI document embedded in each
> `docs.tavily.com/documentation/api-reference/endpoint/{search,extract,crawl,map,research,research-get,usage}.md`
> page. The vendor's older doc URL (`docs.tavily.com/docs/rest-api/api-reference`) 404s.

## Auth setup

Create an API key at https://app.tavily.com and paste it into the connection. The key is sent only
by the `sign` hook, as `Authorization: Bearer <key>`.

The credential probe is `GET /usage`: it costs no credits, requires a key, and returns credit
counters and the plan name only, never key material. A 432/433 (limit exceeded) answer proves a live
key, so it passes the probe; a 401 fails it.

## Actions

| Key              | Endpoint                    | Notes                                                      |
| ---------------- | --------------------------- | ---------------------------------------------------------- |
| `search`         | `POST /search`              | 1 credit (basic/fast/ultra-fast), 2 for advanced           |
| `extract`        | `POST /extract`             | 1-20 URLs; check `failed_results` even on HTTP 200         |
| `crawl`          | `POST /crawl`               | Traverses a site and extracts each page                    |
| `map`            | `POST /map`                 | Returns URLs only                                          |
| `research-start` | `POST /research`            | Async, answers 201 `pending`; not idempotent (bills a task) |
| `research-get`   | `GET /research/{request_id}` | 202 while pending/in_progress, 200 when completed/failed   |
| `usage-get`      | `GET /usage`                | Free; key and plan credit counters                         |

List-valued params (domains, URLs, paths) are text fields: comma or newline separated.

## Things that cost a day

1. **Non-standard error statuses and shapes.** 432 means the key or plan limit is exceeded, 433 the
   pay-as-you-go limit. Errors are `{"detail": {"error": "..."}}`, except 422 validation errors,
   which are `{"detail": [{loc, msg, type}]}`. Both are rendered into the thrown message.
2. **HTTP 200 from `/extract` does not mean the URLs worked.** Failures are in `failed_results`
   and `results` may be empty. The action returns the body unmodified so a workflow can branch.
3. **Research polling has two success statuses.** `research-get` answers 202 while the task runs and
   200 when it is completed or failed (a failed task is a 200). Branch on the body's `status`.
4. **Credit-metered defaults.** Tavily's own defaults are `max_results` 10 and crawl/map `limit` 50;
   this app prefills 5 and 20. Setting crawl/map `instructions` doubles the per-page cost.

## Not yet covered

- `POST /research` with `stream: true` (Server-Sent Events): a request/response action cannot return
  a stream, so `stream` is not exposed. Use `research-start` plus `research-get`.
- `POST /research` `files` attachments (base64 uploads).
- Feedback (beta) and Logs (paid plans only): the page for each was not verified, so neither is
  implemented.
- Search `start_date`/`end_date` filtering flags (`filter_by_published_date`), `include_usage`,
  `exact_match`, `safe_search`, `language`, `include_domains_mode`: omitted from the form, not
  unsupported by Tavily.
- The `X-Project-ID` header on `GET /usage` (project-scoped usage).

## Icon

`assets/icon.svg` is Tavily's own mark, fetched verbatim from https://www.tavily.com/icon.svg
(SVG 55×55, 2,260 bytes). Format with `deno task fmt`, never bare `deno fmt`, which rewrites it.

## Health-check notes

- **`service`** — reads https://status.tavily.com/api/v2/summary.json (Atlassian Statuspage schema;
  `page.name` is `Tavily`). The `Tavily API Service` component decides the verdict. `Tavily MCP` and
  `Tavily Website` are reported as detail and capped at `degraded`. A failing status API, or a page
  that no longer names itself Tavily, is `unknown`, never `down`.
- **`quota`** — reads `GET /usage` (signed): plan credits, pay-as-you-go credits and the per-key cap.
  90% consumed is `degraded`, 100% is `down`. A `null` or zero limit means no ceiling, not
  exhausted. Tavily documents no rate-limit headers, so there is no request-rate check.
