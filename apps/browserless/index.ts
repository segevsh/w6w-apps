import type { AppDefinition } from "@w6w/types";
import screenshot from "./actions/screenshot.ts";
import pdf from "./actions/pdf.ts";
import content from "./actions/content.ts";
import scrape from "./actions/scrape.ts";
import fn from "./actions/function.ts";
import exportAction from "./actions/export.ts";
import performance from "./actions/performance.ts";
import unblock from "./actions/unblock.ts";
import map from "./actions/map.ts";
import search from "./actions/search.ts";
import smartScrape from "./actions/smart-scrape.ts";
import crawlStart from "./actions/crawl-start.ts";
import crawlStatus from "./actions/crawl-status.ts";
import crawlCancel from "./actions/crawl-cancel.ts";
import crawlList from "./actions/crawl-list.ts";
import accountUsageGet from "./actions/account-usage-get.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Browserless — headless-browser REST APIs. Findings that shaped this app (2026-10-06):
 *
 * - Auth is `?token=`, applied in `sign`. A missing token on a regional host is an
 *   edge HTML 401, a wrong one is a plain-text "Invalid API key", and
 *   `api.browserless.io` answers JSON `{"error"}`: three shapes for one condition.
 * - Each account works in a region (sfo, lon, ams), each on its own host. The region
 *   is stored on the connection and only those hosts plus `api.browserless.io` are
 *   ever called. Self-hosted Browserless is deliberately unsupported: a free-form
 *   host would need `network.allow: "*"`.
 * - `/screenshot`, `/pdf`, `/export` and `/function` can answer with bytes, so those
 *   come back as base64 with content type and size.
 * - `/map`, `/search`, `/smart-scrape` and `/crawl` default their proxy to
 *   `residential` (6 units/MB), so the proxy choice is passed in the body explicitly.
 */
const app: AppDefinition = {
  actions: [
    screenshot,
    pdf,
    content,
    scrape,
    fn,
    exportAction,
    performance,
    unblock,
    map,
    search,
    smartScrape,
    crawlStart,
    crawlStatus,
    crawlCancel,
    crawlList,
    accountUsageGet,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
};

export default app;
