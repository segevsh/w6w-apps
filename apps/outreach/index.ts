/**
 * Outreach — the sales engagement platform. Prospects and accounts are worked
 * through sequences of emails, calls and tasks; this app drives that over the
 * Outreach REST API v2 (`api.outreach.io/api/v2`), a JSON:API 1.0 service.
 *
 * Every endpoint, parameter and body field was checked on 2026-10-06 against
 * Outreach's own OpenAPI 3.0.3 document
 * (`outreach-developer-portal.redocly.app/_bundle/api/reference.yaml`, 1,010,345
 * bytes) and the developer-portal pages (`/api/oauth`, `/api/getting-started`,
 * `/api/making-requests`, `/api/common-patterns`, `/api/webhooks`,
 * `/api/deprecated-features`), plus live probes of `api.outreach.io`.
 *
 * Three findings shaped the design (details in README.md):
 *
 *  1. **Webhook configuration holds two credentials** — `secret` (the HMAC key)
 *     and `cleanupToken` (a bearer that can delete the webhook) — and both
 *     come back on reads; they are stripped from every response.
 *  2. **Errors have two shapes** — `{errors:[{id,title,detail}]}` and, for a
 *     token the edge cannot decode, a bare `{error, description}`. The probe
 *     classifies from the body, and treats a 403 scope refusal as proof the
 *     token is live.
 *  3. **Rotating 2-hour tokens** — every refresh issues a new refresh token.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import prospectCreate from "./actions/prospect-create.ts";
import prospectDelete from "./actions/prospect-delete.ts";
import prospectGet from "./actions/prospect-get.ts";
import prospectList from "./actions/prospect-list.ts";
import prospectUpdate from "./actions/prospect-update.ts";
import accountCreate from "./actions/account-create.ts";
import accountDelete from "./actions/account-delete.ts";
import accountGet from "./actions/account-get.ts";
import accountList from "./actions/account-list.ts";
import accountUpdate from "./actions/account-update.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityList from "./actions/opportunity-list.ts";
import sequenceList from "./actions/sequence-list.ts";
import sequenceGet from "./actions/sequence-get.ts";
import sequenceStateCreate from "./actions/sequence-state-create.ts";
import sequenceStateFinish from "./actions/sequence-state-finish.ts";
import sequenceStateList from "./actions/sequence-state-list.ts";
import sequenceStatePause from "./actions/sequence-state-pause.ts";
import sequenceStateResume from "./actions/sequence-state-resume.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskList from "./actions/task-list.ts";
import taskMarkComplete from "./actions/task-mark-complete.ts";
import prospectNoteCreate from "./actions/prospect-note-create.ts";
import mailingList from "./actions/mailing-list.ts";
import userList from "./actions/user-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Prospects
    prospectCreate,
    prospectDelete,
    prospectGet,
    prospectList,
    prospectUpdate,
    // Accounts
    accountCreate,
    accountDelete,
    accountGet,
    accountList,
    accountUpdate,
    // Opportunities
    opportunityCreate,
    opportunityGet,
    opportunityList,
    // Sequences
    sequenceList,
    sequenceGet,
    // Sequence states
    sequenceStateCreate,
    sequenceStateFinish,
    sequenceStateList,
    sequenceStatePause,
    sequenceStateResume,
    // Tasks
    taskCreate,
    taskGet,
    taskList,
    taskMarkComplete,
    // Notes
    prospectNoteCreate,
    // Mailings
    mailingList,
    // Users
    userList,
    // Webhooks
    webhookCreate,
    webhookDelete,
    webhookList,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
