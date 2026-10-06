# Ahrefs

Pull SEO and search-intelligence data from **Ahrefs** — Domain Rating, backlinks, referring
domains, anchors, organic keywords, top pages, competitors, keyword research, the live SERP, Rank
Tracker and Site Audit — over the **Ahrefs API v3**, and read the API-unit allowance.

- **Categories** — marketing, analytics
- **Auth methods** — api-key (`Authorization: Bearer <key>`)
- **Actions** — 20 (all reads)
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  `GET /subscription-info/limits-and-usage`; a schema-correct auth error passes), `quota` (signed
  `limits-and-usage`, informational) + the derived `auth:api-key`

## Setup

1. In Ahrefs, a workspace owner or admin opens **Account settings > API keys** and creates a key.
2. Paste it into the **API key** field. The connection test calls the free
   `GET /subscription-info/limits-and-usage` and labels the connection with the plan name.

The API needs an eligible paid plan. On other plans only the free test queries work (below).

## Actions

| Group | Actions |
| --- | --- |
| Account | `usage-get` (free) |
| Site Explorer | `domain-rating-get`, `domain-rating-history`, `backlinks-stats-get`, `metrics-get`, `backlink-list`, `backlink-broken-list`, `referring-domain-list`, `anchor-list`, `organic-keyword-list`, `top-page-list`, `organic-competitor-list` |
| Keywords Explorer | `keyword-overview-get`, `keyword-matching-term-list`, `keyword-related-term-list` |
| SERP | `serp-overview-get` |
| Rank Tracker / Projects | `rank-tracker-overview-get`, `project-list` (free) |
| Site Audit | `site-audit-project-list`, `site-audit-issue-list` |

Every report action returns the vendor's response key untouched (`backlinks`, `refdomains`,
`keywords`, …) plus `unitsCost` (from `x-api-units-cost-total-actual`) and `rows` (from
`x-api-rows`), both omitted when the header is absent.

Each list action sends a small default `select` (the columns Ahrefs requires you to name) so it
works with no input; pass `select` to choose others. Every default column was checked against the
response schema in Ahrefs' OpenAPI document. Money values (`value`, `cpc`, `org_cost`) are USD
**cents**.

## Cost and free test queries

Ahrefs bills `max(50, per_row_cost x rows)` units per uncached request. A target of `ahrefs.com`,
`yep.com` or `firehose.com` (Site Explorer), or a keyword of only `ahrefs`/`yep`/`firehose`
(Keywords Explorer, SERP), is free — use them to try a workflow. Rank Tracker, Management and
`limits-and-usage` are free too.

## Decisions and caveats

- **Source of truth** — the OpenAPI document at `https://docs.ahrefs.com/openapi.json` (linked from
  `docs.ahrefs.com/llms.txt`). Only v3 is used. The only deprecation notices in it are two Brand
  Radar response fields, an area this app does not cover.
- **Errors are a JSON array** — measured: no key is HTTP 403 `["Error","Forbidden"]`, a bad key HTTP
  401 `["Error","Unauthorized"]`, though the OpenAPI schema documents `{"error": "…"}`. Both forms
  are parsed; the credential verdict is read from the body.
- **No offset** — `limit` is the only paging control (default 1000). To go deeper, narrow with
  `where` / `order_by` rather than paging.
- **`where`** is passed through as the filter-expression text Ahrefs documents
  (<https://docs.ahrefs.com/api/docs/filter-syntax>); it is not validated here.
- **Quota check** — `units_limit_api_key` and `units_limit_workspace` are nullable; a null limit
  yields `unknown`, never a guess. The response shape comes from the OpenAPI schema; it was not
  observed live (no credential in the build session).
- **Status page** — none usable: `status.ahrefs.com` is a bare nginx 404 on every path, and
  `ahrefs.statuspage.io` redirects to Atlassian's marketing page. `service` is declared
  unavailable (informational).
- **Icon** — `assets/icon.svg` is the vendor's own `https://static.ahrefs.com/favicon.svg?v=2`
  (509 bytes, `image/svg+xml`), unedited (the `apple-touch-icon` PNG is the raster fallback).

## Not covered

Brand Radar, Batch Analysis, Content Helper, Web Analytics, GSC Insights, Social Media, the
public/free endpoints, the history/by-country Site Explorer reports (`*-history`,
`metrics-by-country`, `pages-by-*`, `linkeddomains`, `crawled-pages`), Keywords Explorer
`volume-history`/`volume-by-country`/`search-suggestions`, Rank Tracker competitor reports, and every
Management **write** (projects, keywords, competitors, prompts, reports) and Social Media write. The
read shapes of the covered endpoints are verified; the writes were left out to keep the app to
confirmed, low-risk reads.
