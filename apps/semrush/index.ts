/**
 * SEMrush — the SEO and marketing-analytics platform: backlink profiles,
 * referring domains and IPs, linked pages, anchors, competitors, keyword
 * metrics and the account's remaining API units, over the current **v4**
 * Standard API (`api.semrush.com/apis/v4`).
 *
 * Every path, parameter and response field in this app was verified on
 * 2026-09-22 against SEMrush's own v4 API reference
 * (`developer.semrush.com/api/v4/...`) and live `curl` probes against
 * `api.semrush.com` and `www.semrush.com`. Nothing came from a third-party
 * integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two hosts, two auth styles** (`auth/api-key.ts`). The Standard API
 *     takes `Authorization: Apikey <key>`; the legacy free balance endpoint
 *     takes `?key=`. Both are built in the one `sign` hook, chosen by the
 *     request's own host, so no Action ever touches the key.
 *  2. **The balance endpoint costs zero units and therefore is the probe**
 *     (`auth/api-key.ts`). Probing with a Standard-API report would bill the
 *     customer's paid units on every connection test and health run.
 *  3. **That endpoint echoes the key back in its error text**
 *     (`lib/client.ts`, `actions/api-units-balance-get.ts`). An invalid key
 *     returns `invalid api key: <the key that was sent>`, so nothing built on
 *     it ever surfaces the vendor's own message — only a status and a static
 *     replacement.
 *  4. **No quota header, no status page** (`health/service.ts`). No
 *     rate-limit header was found on any probed response, and SEMrush
 *     publishes no reachable public status page, so the app declares one
 *     `informational` reachability check instead of inventing either.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import backlinksOverviewGet from "./actions/backlinks-overview-get.ts";
import backlinksHistoricalSummaryGet from "./actions/backlinks-historical-summary-get.ts";
import backlinksListGet from "./actions/backlinks-list-get.ts";
import backlinksReferringDomainsGet from "./actions/backlinks-referring-domains-get.ts";
import backlinksReferringIpsGet from "./actions/backlinks-referring-ips-get.ts";
import backlinksPagesGet from "./actions/backlinks-pages-get.ts";
import backlinksAnchorsGet from "./actions/backlinks-anchors-get.ts";
import backlinksScoreProfileGet from "./actions/backlinks-score-profile-get.ts";
import backlinksCompetitorsGet from "./actions/backlinks-competitors-get.ts";
import backlinksSummaryComparisonGet from "./actions/backlinks-summary-comparison-get.ts";
import backlinksMatrixGet from "./actions/backlinks-matrix-get.ts";

import keywordMetricsGet from "./actions/keyword-metrics-get.ts";
import apiUnitsBalanceGet from "./actions/api-units-balance-get.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Backlink profile
    backlinksOverviewGet,
    backlinksHistoricalSummaryGet,
    backlinksListGet,
    backlinksReferringDomainsGet,
    backlinksReferringIpsGet,
    backlinksPagesGet,
    backlinksAnchorsGet,
    backlinksScoreProfileGet,
    // Backlink comparison
    backlinksCompetitorsGet,
    backlinksSummaryComparisonGet,
    backlinksMatrixGet,
    // Keywords
    keywordMetricsGet,
    // Account
    apiUnitsBalanceGet,
  ],
  // API key only. SEMrush publishes no OAuth surface for third-party apps; a key
  // bought against API units is the whole authentication story, and it is
  // self-serve rather than sales-gated.
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
