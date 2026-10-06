/**
 * Rendex — screenshot, PDF and rendering API (`api.rendex.dev/v1`).
 *
 * Built from Rendex's API reference, Watch API and error-code pages (2026-10-06); Rendex
 * publishes no OpenAPI document. Covered: capture of a URL, HTML or Markdown (with Mustache
 * data) to an image/PDF, hosted render links, reader-mode extraction, branded artifacts,
 * async batches and jobs, account usage, and Rendex Watch. Not covered: see the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

import renderUrl from "./actions/render-url.ts";
import renderHtml from "./actions/render-html.ts";
import renderMarkdown from "./actions/render-markdown.ts";
import renderLinkCreate from "./actions/render-link-create.ts";
import contentExtract from "./actions/content-extract.ts";
import artifactCreate from "./actions/artifact-create.ts";
import batchCreate from "./actions/batch-create.ts";
import batchGet from "./actions/batch-get.ts";
import jobGet from "./actions/job-get.ts";
import accountGet from "./actions/account-get.ts";
import watchCreate from "./actions/watch-create.ts";
import watchTest from "./actions/watch-test.ts";
import watchList from "./actions/watch-list.ts";
import watchGet from "./actions/watch-get.ts";
import watchRunsList from "./actions/watch-runs-list.ts";
import watchRun from "./actions/watch-run.ts";
import watchUpdate from "./actions/watch-update.ts";
import watchDelete from "./actions/watch-delete.ts";

export default {
  actions: [
    renderUrl,
    renderHtml,
    renderMarkdown,
    renderLinkCreate,
    contentExtract,
    artifactCreate,
    batchCreate,
    batchGet,
    jobGet,
    accountGet,
    watchCreate,
    watchTest,
    watchList,
    watchGet,
    watchRunsList,
    watchRun,
    watchUpdate,
    watchDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
