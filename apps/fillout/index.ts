/**
 * Fillout — the form, survey and scheduling builder: list forms, read their
 * schemas and submissions, import submissions, and subscribe webhooks, over the
 * Fillout REST API v1 (`api.fillout.com/v1/api`, or `eu-api.fillout.com` for an
 * EU account).
 *
 * Every path, verb, query parameter, body field, bound and enum in this app was
 * verified on 2026-08-11 against Fillout's own OpenAPI 3.0.1 fragments — one
 * per endpoint, served at `fillout.com/help/api-reference/<page>.md` and
 * enumerated from the reference index at `fillout.com/help/llms.txt` — plus
 * live probes against `api.fillout.com`, `eu-api.fillout.com` and
 * `fillout.statuspage.io`. Nothing here came from a third-party integration
 * directory.
 *
 * The API is exactly **eight endpoints**, and this app implements all eight.
 * That is the whole documented surface, not a selection.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Every credential failure is a `400`, and only the prose distinguishes
 *     them** (`lib/client.ts#classifyCredentialMessage`). No header → "API
 *     authorization header missing"; unusable header → "API Authorization
 *     header missing" — differing from the first by one capital letter and
 *     nothing else; malformed key → "API key missing underscore"; rejected key
 *     → "API Key invalid". There is no 401, no 403, and no machine-readable
 *     error code anywhere in the body.
 *  2. **A `400` is not even always about auth** (`lib/client.ts#formatFilloutError`).
 *     `POST /v1/api/forms/{formId}/submissions` validates its body *before* it
 *     authenticates: unauthenticated with `{}` it answers a Zod issue list and
 *     never mentions the credential. The sibling `POST /v1/api/webhook/create`
 *     with an equally invalid body answers the auth error instead, so the
 *     ordering is per-route.
 *  3. **The status page is branded Zite, not Fillout** (`health/service.ts`).
 *     Fillout's own footer links to `fillout.statuspage.io`, whose `page` block
 *     reads `{"name": "Zite", "url": "https://status.zite.com"}`. Meanwhile
 *     `status.fillout.com` — the host anyone would guess — answers 404 from an
 *     unrelated Next.js app. The check pins the page **id**, because a
 *     name-based sanity guard would reject the correct page.
 *  4. **The webhook id changes type between the two webhook endpoints**
 *     (`actions/webhook-create.ts`, `actions/webhook-delete.ts`). Create
 *     answers `{"id": <integer>}`; Delete's schema declares
 *     `webhookId: <string>`. Handing the integer straight back is the obvious
 *     move and the one the delete schema rejects.
 *
 * And the number that bites in production: **5 requests per second, per
 * account/API key**. `health/request-rate.ts` publishes it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";

import submissionList from "./actions/submission-list.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionCreate from "./actions/submission-create.ts";
import submissionDelete from "./actions/submission-delete.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";
import plan from "./health/plan.ts";

export default {
  actions: [
    // Forms
    formList,
    formGet,
    // Submissions
    submissionList,
    submissionGet,
    submissionCreate,
    submissionDelete,
    // Webhooks
    webhookCreate,
    webhookDelete,
  ],
  // API key only. Fillout does publish an OAuth surface for "3rd party apps",
  // but its documented exchange omits `response_type`, `grant_type` and
  // `scope`, answers `{access_token, base_url}` rather than an RFC 6749 token
  // response, can return a `base_url` on an arbitrary self-hosted origin, and
  // requires Fillout's approval to create — so none of it can be exercised or
  // verified from here. The README states exactly what that defers.
  auth: [apiKey],
  healthChecks: [service, requestRate, plan],
} satisfies AppDefinition;
