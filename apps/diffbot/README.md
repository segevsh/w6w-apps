# Diffbot

Web data for a workflow: turn any page into structured data (articles, products, images, videos,
discussions, events, lists, job posts), crawl whole sites, search and enrich the Diffbot Knowledge
Graph, run Natural Language analysis on text, and search the web. Vendor docs:
<https://docs.diffbot.com> (server-rendered copy: <https://www.diffbot.com/docs/>).

Categories: **ai**, **search**, **developer-tools**. Icon: the vendor's favicon, verbatim.

## Connecting

Create an API token at <https://app.diffbot.com> (shown on the dashboard home). One token covers every
API. The connection's `sign` hook places it per host; no action ever sees it:

| Host | Used by | Placement |
| --- | --- | --- |
| `api.diffbot.com` | Extract, Crawl, Account | `?token=<token>` |
| `kg.diffbot.com` | Knowledge Graph search and enhance | `?token=<token>` |
| `nl.diffbot.com` | Natural Language | `?token=<token>` |
| `llm.diffbot.com` | Web Search | `Authorization: Bearer <token>` (a `token` query parameter is ignored there) |

**Connection test.** A signed Knowledge Graph (DQL) search for an entity that does not exist. It
returns zero entities, which Diffbot does not bill, and its body is a result envelope, never the
credential. 2xx, or a 400 DQL parse-error envelope, means the token got through; 401/403 is a
rejection; 429 is reported as throttled, not rejected. The verdict is read from the body.
`GET /v4/account` is deliberately not the probe: it echoes the token. Web Search is no use either:
it answered 200 for an invented bearer token.

## Actions (20)

| Action | Route | Notes |
| --- | --- | --- |
| Analyze Page | `GET /v3/analyze` | auto-detects the page type; `mode` forces one |
| Extract Article | `GET /v3/article` | paging, tags, sentiment, summary |
| Extract Product | `GET /v3/product` | |
| Extract Image | `GET /v3/image` | |
| Extract Video | `GET /v3/video` | |
| Extract Discussion | `GET /v3/discussion` | threads, paging |
| Extract Event (beta) | `GET /v3/event` | |
| Extract List (beta) | `GET /v3/list` | |
| Extract Job Post (beta) | `GET /v3/job` | |
| Extract from HTML | `POST /v3/{api}` | your own markup; `text/plain` for Article only |
| Search Knowledge Graph (DQL) | `POST /kg/v3/dql` | |
| Enhance Person or Organization | `GET /kg/v3/enhance` | best match for a partial record |
| Analyze Text (Natural Language) | `POST /v1/` on `nl` | entities, facts, sentiment, categories, summary |
| Web Search | `POST /api/v1/web_search` on `llm` | |
| Get Account Usage | `GET /v4/account` | plan, credits, daily usage; token stripped |
| Create Crawl Job | `POST /v3/crawl` | form-encoded |
| Get Crawl Job Status | `GET /v3/crawl` | one job or all; adds `finished` |
| Pause / Resume / Restart Crawl | `POST /v3/crawl` | pause, resume, start-round, restart |
| Delete Crawl Job | `POST /v3/crawl` | `delete=1` |
| Get Crawl Data | `GET /v3/crawl/data` | JSON or CSV |

## Vendor behaviour worth knowing

- **The token leaks through several response fields, and the actions strip them.** Account returns
  `token` and every `childTokens` entry; a crawl job's `downloadJson` / `downloadUrls` are built from
  the token; every crawl data record carries a `token` field (and a CSV `token` column). None of
  these reach the workflow. Use Get Crawl Data for results instead of the download URLs.
- **Errors can arrive with a 2xx.** Extract and Crawl bodies may carry `errorCode` / `error`; the
  client throws when the code is 400 or above.
- **Extract and Crawl take form or query parameters; Knowledge Graph and Natural Language take
  JSON.** Natural Language wants an array body, so the action wraps your text in one.
- **Crawl jobs are asynchronous.** Create one, poll Get Crawl Job Status until `finished` is true
  (status codes 1, 2, 3, 5, 9, 10, 11), then read the data.
- **Zero-result Knowledge Graph searches are free.** Other calls cost credits; see Diffbot's pricing
  page for the per-API figures.
- **Rate limits and credit exhaustion are both `429`** (Knowledge Graph reports "Insufficient
  credits"); the action errors say so.

## Not covered

Bulk Extract and bulk Enhance, Custom API management, DQL reports, coverage and CSV export, crawl
search, Knowledge Graph exports, PDF upload, and ontology/taxonomy browsing. Each is a separate
surface that can be added without changing the connection.

## Health checks

| Check | Kind | Probe |
| --- | --- | --- |
| `service` | service | Declared `unavailable`, informational. `status.diffbot.com` is a Pingdom Public Reports page (HTML only); `/index.json`, `/api/v2/summary.json`, `/rss`, `/history.atom` and `/feed.rss` all answer 404, so there is nothing machine-readable to fetch. |
| `api` | dependency | Unsigned request to each of the four hosts. Diffbot's JSON `401` (`code` 401 plus a `message`) is a pass; a 5xx is `down`; any other body is `unknown`. |
| `quota` | quota | Declared `unavailable`, informational. No remaining-credit figure or rate-limit header is published, and `/v4/account` echoes the token. |

Plus the derived `auth:api-token` check from the connection test. `unavailable` entries carry
`informational` severity so they never pin the App's verdict at `unknown`.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
