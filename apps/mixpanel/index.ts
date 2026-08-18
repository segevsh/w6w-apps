/**
 * Mixpanel — query product analytics from a workflow, and write events and user
 * profiles into it.
 *
 * Mixpanel publishes no single OpenAPI document, so paths come from its
 * reference documentation and the behaviour below was **measured against the
 * live hosts on 2026-08-18**.
 *
 * ## The finding that shaped this app: `/track` cannot fail
 *
 * Mixpanel's best-known ingestion endpoint answers **HTTP 200 for everything**,
 * including a completely bogus project token:
 *
 *   POST api.mixpanel.com/track?verbose=1
 *   [{"event":"test","properties":{"token":"bogustoken","distinct_id":"x"}}]
 *   → 200  {"error":null,"status":1}
 *
 * The token is not validated at ingest. A workflow using `/track` therefore
 * cannot learn that its events are going nowhere — the call succeeds, the data
 * does not arrive, and nobody notices until a dashboard is empty. Only
 * structural problems are caught (`{"error":"event, missing","status":0}`), and
 * even those arrive inside a `200`.
 *
 * **So this app does not use `/track` at all.** `event-import` uses
 * `POST /import`, which authenticates with the service account (a bogus one
 * answers `{"code":401,"error":"Not a valid service account username"}`),
 * validates with `strict=1`, and returns a real status code.
 *
 * ## `$insert_id` is the difference between a retry and a double-count
 *
 * Mixpanel deduplicates on *(event, time, distinct_id, $insert_id)*. That is
 * the only thing standing between a retried workflow and double-counted
 * revenue, so `event-import` **refuses events without one** rather than letting
 * Mixpanel mint a fresh id per attempt. It matters more than usual here because
 * a `400` from `strict=1` still imports the valid records — a partial failure
 * has already written part of the batch, and the retry is only safe because the
 * ids are stable.
 *
 * ## Two credentials, and Mixpanel does not let you pick
 *
 * Query, raw export and event import authenticate with the **service account**.
 * Profile writes do not: measured, `/engage` with a valid-shaped Basic
 * credential *and* `project_id` still answers
 * `{"error":"$token, missing or empty","status":0}` — the project token has to
 * be inside the payload.
 *
 * An Action may never touch a credential, so the token is injected by the auth
 * **`sign` hook**, which is the one hook allowed to hold one and which receives
 * the request *body* as well as its headers. It stamps `$token` into `/engage`
 * payloads and nowhere else. The token is optional: without it everything works
 * except the two profile-writing actions, which say so before calling.
 *
 * ## Three host families, three regions each
 *
 * | Purpose | US | EU | India |
 * |---|---|---|---|
 * | Query | `mixpanel.com` | `eu.mixpanel.com` | `in.mixpanel.com` |
 * | Ingestion | `api.mixpanel.com` | `api-eu.mixpanel.com` | `api-in.mixpanel.com` |
 * | Raw export | `data.mixpanel.com` | `data-eu.mixpanel.com` | `data-in.mixpanel.com` |
 *
 * All nine answer. A project lives in one residency region and the wrong host
 * does not redirect, so the region is part of the credential — and the `service`
 * health check watches only that region's components.
 *
 * ## Sixty queries an hour
 *
 * The Query API allows **60 queries per hour and 5 concurrent, per project** —
 * shared with the company's dashboards and BI tools — and reports a breach as a
 * bare `429` with no headers. It is the number to design around: query once and
 * iterate over the result, never once per row. The raw Export API has its own
 * 60/hour, and ingestion is metered by volume instead.
 *
 * Deliberately out of scope:
 *   - **`/track`**, for the reason above.
 *   - **The Funnels Query API**, which Mixpanel has put in maintenance mode and
 *     itself recommends replacing with a saved report queried through
 *     `insights-query`.
 *   - **JQL**, a deprecated custom query language.
 *   - **The data-deletion (GDPR) API**, which is an asynchronous job queue with
 *     its own compliance semantics — `profile-delete` says plainly that it is
 *     not an erasure.
 *   - **Group profiles**, which need a group key configured on the project
 *     before any of it means anything.
 */
import type { AppDefinition } from "@w6w/types";
import serviceAccount from "./auth/service-account.ts";

import insightsQuery from "./actions/insights-query.ts";
import segmentationQuery from "./actions/segmentation-query.ts";
import retentionQuery from "./actions/retention-query.ts";
import eventNameList from "./actions/event-name-list.ts";
import eventPropertyValues from "./actions/event-property-values.ts";
import lexiconSchemaList from "./actions/lexicon-schema-list.ts";

import profileQuery from "./actions/profile-query.ts";
import cohortList from "./actions/cohort-list.ts";
import activityList from "./actions/activity-list.ts";

import eventImport from "./actions/event-import.ts";
import profileUpdate from "./actions/profile-update.ts";
import profileDelete from "./actions/profile-delete.ts";
import eventExport from "./actions/event-export.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // reports — start with the saved one
    insightsQuery,
    segmentationQuery,
    retentionQuery,
    // what is in the project
    eventNameList,
    eventPropertyValues,
    lexiconSchemaList,
    // people
    profileQuery,
    cohortList,
    activityList,
    // writing
    eventImport,
    profileUpdate,
    profileDelete,
    // getting it all out
    eventExport,
  ],
  auth: [serviceAccount],
  healthChecks: [service, quota],
} satisfies AppDefinition;
