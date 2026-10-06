import type { AppDefinition } from "@w6w/types";
import extractAnalyze from "./actions/extract-analyze.ts";
import extractArticle from "./actions/extract-article.ts";
import extractProduct from "./actions/extract-product.ts";
import extractImage from "./actions/extract-image.ts";
import extractVideo from "./actions/extract-video.ts";
import extractDiscussion from "./actions/extract-discussion.ts";
import extractEvent from "./actions/extract-event.ts";
import extractList from "./actions/extract-list.ts";
import extractJob from "./actions/extract-job.ts";
import extractHtml from "./actions/extract-html.ts";
import kgSearch from "./actions/kg-search.ts";
import kgEnhance from "./actions/kg-enhance.ts";
import nlProcessText from "./actions/nl-process-text.ts";
import webSearch from "./actions/web-search.ts";
import accountGet from "./actions/account-get.ts";
import crawlCreate from "./actions/crawl-create.ts";
import crawlGet from "./actions/crawl-get.ts";
import crawlUpdate from "./actions/crawl-update.ts";
import crawlDelete from "./actions/crawl-delete.ts";
import crawlDataGet from "./actions/crawl-data-get.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Diffbot — web extraction, Knowledge Graph and NLP. Findings that shaped this app
 * (2026-10-06):
 *
 * - docs.diffbot.com answers every path with the same 178 KB shell and redirects
 *   real pages to www.diffbot.com/docs/…; the real content is server-rendered there.
 * - Four hosts, two credential shapes: a `token` query parameter everywhere except
 *   Web Search (`llm.diffbot.com`), which wants `Authorization: Bearer`, and accepts
 *   a made-up one.
 * - `GET /v4/account`, the Crawl job's download URLs and every Crawl data record
 *   carry the caller's token. The actions that touch them strip it.
 */
const app: AppDefinition = {
  actions: [
    extractAnalyze,
    extractArticle,
    extractProduct,
    extractImage,
    extractVideo,
    extractDiscussion,
    extractEvent,
    extractList,
    extractJob,
    extractHtml,
    kgSearch,
    kgEnhance,
    nlProcessText,
    webSearch,
    accountGet,
    crawlCreate,
    crawlGet,
    crawlUpdate,
    crawlDelete,
    crawlDataGet,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
};

export default app;
