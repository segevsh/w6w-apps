/**
 * CallRail — call tracking and conversation-analytics platform: read and
 * manage calls, text-message conversations, form submissions, tracking
 * numbers, companies, tags and users over the CallRail API v3
 * (`api.callrail.com`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * on 2026-08-15 against CallRail's own single-page reference
 * (`apidocs.callrail.com`, 891,328 bytes, fetched and read whole — it is the
 * entire reference) plus live, unauthenticated probes against
 * `api.callrail.com` and `status.callrail.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The findings that shaped the design, documented in full where they matter:
 *
 *  1. **API keys are scoped to a user, not to one account**, and a user can
 *     belong to more than one account (`auth/api-token.ts`). So this app
 *     never infers `accountId` from the credential — every action takes it
 *     explicitly, and `account-list` is how a workflow discovers which ids a
 *     key can reach.
 *  2. **The auth probe is `/v3/a.json`** (`auth/api-token.ts`), not any
 *     account-scoped read: it needs a credential, needs no account id or
 *     company access, and returns no secret material — unlike an
 *     account-scoped whoami, which the reference's own examples show can be
 *     legitimately unreachable for a key scoped away from that account.
 *  3. **CallRail's error body is a flat string** (`{"error": "<message>"}`),
 *     verified live — not a structured `{type, message}` the way some vendors
 *     shape it. `lib/client.ts` surfaces the vendor's own sentence rather
 *     than inventing a taxonomy CallRail doesn't have.
 *  4. **List responses key their array by the resource's own plural**
 *     (`"calls"`, `"companies"`, `"users"`, `"tags"`, `"trackers"`,
 *     `"form_submissions"`, `"conversations"`, `"accounts"`) rather than a
 *     fixed `"data"`/`"items"` field, so every list action reads its own key
 *     (`lib/client.ts`).
 *  5. **Fixed rate limits with no readable headroom** (`health/quota.ts`):
 *     the reference documents hourly/daily ceilings but no header or endpoint
 *     reports remaining quota against them — verified with a live probe that
 *     carried no `X-RateLimit-*` header. Declared unavailable rather than
 *     invented.
 *  6. **Some fields are documented `(Deprecated)` but still returned/accepted
 *     for compatibility** (`swap_exclude_jquery`, `keyword_spotting_enabled`
 *     on Companies) — kept out of this app's params rather than exposed as
 *     working knobs, since setting a documented no-op would mislead a
 *     workflow author. Separately, `created_at` on Form Submissions is
 *     flagged as *becoming* deprecated as a sort field in favor of
 *     `submitted_at`; both remain sortable today, and the param hint says so.
 *
 * Left out entirely, and why: creating a Tracker (the request body's shape
 * depends on `type` — session vs. source — in ways a static form would either
 * under- or over-model, see `actions/tracker-list.ts`); MMS via multipart
 * file upload (`media_file`; only the `media_url` form is implemented, see
 * `actions/text-message-send.ts`); and Ignoring Form Fields / Summarizing
 * Form Data / Call Timeseries / Page Views / Message Flows / Notifications /
 * Caller IDs / Integrations / Summary Emails / Leads — all real, documented
 * endpoints, left out for this first pass to keep the surface reviewable
 * rather than exhaustive.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";

import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callCreate from "./actions/call-create.ts";
import callUpdate from "./actions/call-update.ts";
import callSummaryGet from "./actions/call-summary-get.ts";
import callRecordingGet from "./actions/call-recording-get.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";

import trackerList from "./actions/tracker-list.ts";
import trackerGet from "./actions/tracker-get.ts";

import formSubmissionList from "./actions/form-submission-list.ts";
import formSubmissionCreate from "./actions/form-submission-create.ts";
import formSubmissionUpdate from "./actions/form-submission-update.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import textMessageList from "./actions/text-message-list.ts";
import textMessageGet from "./actions/text-message-get.ts";
import textMessageSend from "./actions/text-message-send.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Accounts
    accountList,
    accountGet,
    // Calls
    callList,
    callGet,
    callCreate,
    callUpdate,
    callSummaryGet,
    callRecordingGet,
    // Companies
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    // Tags
    tagList,
    tagCreate,
    tagUpdate,
    tagDelete,
    // Trackers
    trackerList,
    trackerGet,
    // Form submissions
    formSubmissionList,
    formSubmissionCreate,
    formSubmissionUpdate,
    // Users
    userList,
    userGet,
    // Text messages
    textMessageList,
    textMessageGet,
    textMessageSend,
  ],
  // API key only. CallRail publishes no OAuth surface for third-party apps —
  // the reference's whole "Authorization" section is the API key header.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
