/**
 * Perspective (perspective.co) — the funnel builder. This app covers its whole
 * documented External REST API: workspaces, CRM contacts, and metrics.
 *
 * Every path, parameter and enum was verified on 2026-10-06 against
 * developers.perspective.co plus live probes of `api.perspective.co`.
 *
 * Findings that shaped it:
 *
 *  1. **The host is `api.perspective.co/v1`.** `perspective-api.co` also answers
 *     but is documented nowhere; it is neither used nor allow-listed.
 *  2. **Pages are 0-based**, `limit` is 1-100, and lists answer
 *     `{data, meta: {total, page, limit, hasNext}}`.
 *  3. **Writes are narrow.** Create Contact refuses `meta`/`utmParams`/
 *     `properties`; custom properties are written one at a time through Update
 *     Contact Value, whose `value` is always a string. The `timezone` contact
 *     field is deprecated (use `meta.ps_timezone`) and is not offered.
 *  4. **`abTest` is only valid for one chart subtype** and is a 400 otherwise.
 *
 * Email sequences, funnel building and brands exist only on Perspective's MCP
 * server, not REST, so they are out of scope.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import workspaceList from "./actions/workspace-list.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdateValue from "./actions/contact-update-value.ts";
import kpiGet from "./actions/kpi-get.ts";
import chartGet from "./actions/chart-get.ts";
import insightGet from "./actions/insight-get.ts";

import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    workspaceList,
    contactList,
    contactGet,
    contactCreate,
    contactUpdateValue,
    kpiGet,
    chartGet,
    insightGet,
  ],
  auth: [apiKey],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
