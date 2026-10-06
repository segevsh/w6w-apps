/**
 * QuickChart — chart, QR code, barcode, word cloud, table and Graphviz image rendering over
 * `quickchart.io`. Routes and parameters were verified 2026-10-06 against the vendor's own
 * OpenAPI document (`/openapi.json`) and docs site, plus live probes.
 *
 * Auth is optional: the API answers anonymously, and an API key (sent as a Bearer header) only
 * lifts the rate limit. Image routes answer binary, which is written to the run's file store.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import chartRender from "./actions/chart-render.ts";
import chartUrlCreate from "./actions/chart-url-create.ts";
import chartValidate from "./actions/chart-validate.ts";
import chartDraftFromText from "./actions/chart-draft-from-text.ts";
import qrRender from "./actions/qr-render.ts";
import qrUrlBuild from "./actions/qr-url-build.ts";
import qrValidate from "./actions/qr-validate.ts";
import qrRead from "./actions/qr-read.ts";
import barcodeRender from "./actions/barcode-render.ts";
import wordcloudRender from "./actions/wordcloud-render.ts";
import tableRender from "./actions/table-render.ts";
import graphvizRender from "./actions/graphviz-render.ts";
import watermarkApply from "./actions/watermark-apply.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chartRender,
    chartUrlCreate,
    chartValidate,
    chartDraftFromText,
    qrRender,
    qrUrlBuild,
    qrValidate,
    qrRead,
    barcodeRender,
    wordcloudRender,
    tableRender,
    graphvizRender,
    watermarkApply,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
