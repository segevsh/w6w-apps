/**
 * Tavily — web search, extraction, crawling, site mapping and cited research
 * for AI agents, over the Tavily REST API (`api.tavily.com`).
 *
 * Every path, field and enum was verified on 2026-10-06 against the OpenAPI
 * document embedded in each `docs.tavily.com/documentation/api-reference/endpoint/*.md`
 * page. Findings that shape the design:
 *
 *  1. **Non-standard error statuses and shapes** (`lib/client.ts`): 432 and 433
 *     mean key/plan and pay-as-you-go limits; errors are `{detail: {error}}`
 *     except 422, which is `{detail: [...]}`.
 *  2. **HTTP 200 does not mean every URL worked** (`actions/extract.ts`): failed
 *     URLs are in `failed_results`.
 *  3. **Research is asynchronous with two success statuses** (`actions/research-get.ts`):
 *     202 while running, 200 when completed or failed. Poll on the body's `status`.
 *  4. **The auth probe is `GET /usage`** (`auth/api-key.ts`): free, requires a
 *     key, and returns counters only.
 *
 * Not covered: Research streaming (SSE), Feedback (beta) and Logs (paid plans
 * only); see the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import search from "./actions/search.ts";
import extract from "./actions/extract.ts";
import crawl from "./actions/crawl.ts";
import map from "./actions/map.ts";
import researchStart from "./actions/research-start.ts";
import researchGet from "./actions/research-get.ts";
import usageGet from "./actions/usage-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [search, extract, crawl, map, researchStart, researchGet, usageGet],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
