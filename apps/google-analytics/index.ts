/**
 * Google Analytics (GA4) — run reports and manage properties, data streams and
 * key events.
 *
 * Every path, parameter, required body field and response shape was taken from
 * Google's own discovery documents, fetched 2026-08-18:
 * `https://analyticsdata.googleapis.com/$discovery/rest?version=v1beta` and
 * `https://analyticsadmin.googleapis.com/$discovery/rest?version=v1beta`. The
 * OAuth shape, the scope-namespace convention and the "property id as a
 * connection field" pattern follow this pack's `google-ads` app.
 *
 * **GA4 is two APIs on two hosts**, and the split is not cosmetic:
 *
 *   - **Data API** (`analyticsdata.googleapis.com`) — reporting. Every report
 *     is a POST whose body is the query, and paging happens with `limit` and
 *     `offset` inside that body.
 *   - **Admin API** (`analyticsadmin.googleapis.com`) — the configuration tree:
 *     accounts, properties, data streams, key events, custom definitions. These
 *     page with `pageToken`.
 *
 * Both hosts are declared; the generic `www.googleapis.com` is not, because
 * allowing it would widen the sandbox to every Google service. `access-report-run`
 * is the one action that looks like a report but lives on the Admin API, and it
 * says so.
 *
 * Deliberately out of scope:
 *   - **Universal Analytics.** GA4 only. UA's reporting API was shut down and
 *     the `analytics` scope that still appears in the Data API's discovery
 *     document is its legacy scope; this app asks for `analytics.readonly` and
 *     `analytics.edit` instead.
 *   - **Event ingestion.** Sending events is the Measurement Protocol, a
 *     different endpoint authenticated with an API secret per data stream, and
 *     an SDK's job rather than an integration's.
 *   - **`conversionEvents`.** The v1beta document still carries it, but it is
 *     the old name for `keyEvents`; shipping both would be two actions
 *     reporting one list.
 *   - **Account and property deletion, Firebase and Google Ads links,
 *     measurement-protocol secrets, `provisionAccountTicket`.** Administration
 *     and account provisioning rather than analytics automation, and each needs
 *     reach this app's scopes deliberately do not ask for.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import reportRun from "./actions/report-run.ts";
import reportRunRealtime from "./actions/report-run-realtime.ts";
import reportRunPivot from "./actions/report-run-pivot.ts";
import reportBatchRun from "./actions/report-batch-run.ts";
import metadataGet from "./actions/metadata-get.ts";
import compatibilityCheck from "./actions/compatibility-check.ts";
import accessReportRun from "./actions/access-report-run.ts";
import accountSummaryList from "./actions/account-summary-list.ts";
import accountList from "./actions/account-list.ts";
import propertyList from "./actions/property-list.ts";
import propertyGet from "./actions/property-get.ts";
import propertyCreate from "./actions/property-create.ts";
import propertyUpdate from "./actions/property-update.ts";
import dataStreamList from "./actions/data-stream-list.ts";
import dataStreamGet from "./actions/data-stream-get.ts";
import keyEventList from "./actions/key-event-list.ts";
import keyEventCreate from "./actions/key-event-create.ts";
import customDimensionList from "./actions/custom-dimension-list.ts";
import customMetricList from "./actions/custom-metric-list.ts";
import dataRetentionGet from "./actions/data-retention-get.ts";
import audienceExportCreate from "./actions/audience-export-create.ts";
import audienceExportList from "./actions/audience-export-list.ts";
import audienceExportQuery from "./actions/audience-export-query.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // reporting (Data API)
    reportRun,
    reportRunRealtime,
    reportRunPivot,
    reportBatchRun,
    metadataGet,
    compatibilityCheck,
    // access audit (Admin API, despite being a report)
    accessReportRun,
    // account / property (Admin API)
    accountSummaryList,
    accountList,
    propertyList,
    propertyGet,
    propertyCreate,
    propertyUpdate,
    // data stream
    dataStreamList,
    dataStreamGet,
    // key event
    keyEventList,
    keyEventCreate,
    // custom definitions + retention
    customDimensionList,
    customMetricList,
    dataRetentionGet,
    // audience export (Data API, long-running)
    audienceExportCreate,
    audienceExportList,
    audienceExportQuery,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
