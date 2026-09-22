/**
 * Workiz — the field-service-management platform a home-service business runs
 * its day on: team and time off, leads, jobs, and payments against a job. This
 * app covers the whole public surface of Workiz's API v1 (`api.workiz.com`).
 *
 * Every path, verb, query parameter, body field and enum was verified on
 * 2026-09-22 against Workiz's own OpenAPI 3.0.0 document
 * (`http://developer.workiz.com/api.json`, 62,971 bytes, `info.title:
 * "Workiz"`) and live probes against `api.workiz.com` and
 * `workiz.statuspage.io`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings shaped the design, each documented in full where it matters:
 *
 *  1. **The account token is a URL path segment, not a header**
 *     (`auth/api-token.ts`, `lib/client.ts`). Workiz's every path reads
 *     `https://api.workiz.com/api/v1/{api_token}/<endpoint>`; the document
 *     declares no `Authorization` header, no bearer scheme and no query-parameter
 *     token. Actions therefore build the *token-free* URL, and the `sign` hook is
 *     the only code that inserts the segment — so no action can leak or misplace
 *     the credential, and every error message is token-free by construction.
 *  2. **There is a second, per-record secret — `auth_secret`**
 *     (`lib/params.ts`). A lead or job create/get response hands back a
 *     `sec_…` value, and update/assign/unassign/markLost/activate/convert/
 *     addPayment all require it. It belongs to one record, not to the connection,
 *     so it is an ordinary Action input and never touches `sign`.
 *  3. **Rate-limit headroom is a documented absence** (`health/request-rate.ts`).
 *     Workiz sends no `X-RateLimit-*` headers and documents no limits endpoint,
 *     so the request-rate dimension is declared `unavailable` at
 *     `informational` severity rather than probed — and there is no `quota`
 *     check beside it, because the API has no account/usage resource to read.
 *
 * The wire format is reproduced literally. Workiz mixes PascalCase, camelCase
 * and `snake_case` (`auth_secret`, `item_cost`, `tech_cost`) across resources,
 * and the server-side schemas genuinely differ between two calls that look
 * alike — `/lead/get/` answers an array of leads while `/job/get/` answers an
 * array of `{flag, data: Job}` wrappers, and the assign calls answer a bare
 * array on the lead side and a `{flag, data}` envelope on the job side. The
 * client carries those differences rather than normalising them away.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import timeOffList from "./actions/time-off-list.ts";
import timeOffListForUser from "./actions/time-off-list-for-user.ts";

import leadGet from "./actions/lead-get.ts";
import leadList from "./actions/lead-list.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadMarkLost from "./actions/lead-mark-lost.ts";
import leadActivate from "./actions/lead-activate.ts";
import leadAssign from "./actions/lead-assign.ts";
import leadUnassign from "./actions/lead-unassign.ts";
import leadConvert from "./actions/lead-convert.ts";

import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobCreate from "./actions/job-create.ts";
import jobUpdate from "./actions/job-update.ts";
import jobAssign from "./actions/job-assign.ts";
import jobUnassign from "./actions/job-unassign.ts";
import jobAddPayment from "./actions/job-add-payment.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Team
    teamList,
    teamGet,
    // Time off
    timeOffList,
    timeOffListForUser,
    // Leads
    leadGet,
    leadList,
    leadCreate,
    leadUpdate,
    leadMarkLost,
    leadActivate,
    leadAssign,
    leadUnassign,
    leadConvert,
    // Jobs
    jobGet,
    jobList,
    jobCreate,
    jobUpdate,
    jobAssign,
    jobUnassign,
    jobAddPayment,
  ],
  // The account API token only. Workiz publishes no OAuth surface for
  // third-party apps, and the per-record `auth_secret` is not a connection
  // credential — see auth/api-token.ts.
  auth: [apiToken],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
