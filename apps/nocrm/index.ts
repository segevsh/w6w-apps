/**
 * noCRM.io — a lead-management / sales CRM.
 *
 * Covers the lead lifecycle, its comments, client folders, and the account's
 * own reference data (users, teams, pipelines, steps, categories, predefined
 * tags) plus webhooks. Two things shape this app:
 *
 * **Every account has its own host.** noCRM serves each account from
 * `https://YOUR_SUBDOMAIN.nocrm.io`, and its API document writes every path
 * against that placeholder — the same shape as `apps/gorgias`'s
 * `<domain>.gorgias.com`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares the wildcard `*.nocrm.io`. The runtime's
 *     egress matcher accepts any subdomain of it and still refuses everything
 *     else.
 *   - the subdomain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on the
 *     connection's redacted `display`, and `lib/client.ts` reads it from there —
 *     so the client can address the right host without ever seeing a credential.
 *
 * **There are two credential shapes, not one.** The document's Authentication
 * section frames them as distinct grants, so they are two Auth methods rather
 * than one field with a mode switch:
 *
 *   - `api-key` (`X-API-KEY`) — account-level, "for the account and it grants
 *     you admin rights". A lead created with it and no `user_id` becomes
 *     unassigned.
 *   - `user-token` (`X-USER-TOKEN`) — user-dependent: "all the requests will use
 *     the privacy of the users and some requests won't be allowed depending of
 *     the user rights". At least one documented parameter, `user_id` on
 *     lead-create, "returns an error in case you are using the login user method
 *     to authenticate (USER token)".
 *
 * Both `sign` onto their own header and both `test` against the same documented
 * `GET /api/v2/ping`, classified from the response **body** — the Errors section
 * makes `type` the attribute to test, and every auth refusal is an
 * `unauthorized_*` type — never from the bare status code.
 *
 * **Two API surfaces, both documented.** The 21 actions split across the
 * versioned `/api/v2` API and the Simplified API at `/api/simple`, whose
 * endpoints are GET-only by design ("This API accepts only GET requests to
 * simplify the use") and authenticated with `X-API-KEY` alone. Two of this app's
 * actions wrap a Simplified-API GET that mutates a lead (`lead-add-tag`,
 * `lead-log-activity`); they are typed `perform` and named by effect, not verb.
 *
 * **Deliberately absent.** No `webhook-events` listing action, though the
 * document describes the endpoint; no `get_all_contacts`, which needs a second
 * `X-API-PARTNER-KEY` partner credential and belongs to a VOIP-partner feature
 * rather than this app's own auth surface; and none of the Simplified API's
 * `duplicate-lead` / `assign-lead-*` / `change-lead-status-*` / email shortcuts,
 * nor the `/v2` lead `assign`, `duplicate`, `business-card`, `call`,
 * `attachment`, `action-history` or `post-sales` families — the reviewed v1
 * surface is the 21 actions below, matching this pack's per-app scope (compare
 * `apps/gorgias`'s 22 actions). `health/service.ts` and `health/quota.ts` are
 * declared absences with their evidence; there is no `service` feed to read and
 * no quota figure to report.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import userToken from "./auth/user-token.ts";

import subdomain from "./health/subdomain.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

import leadCreate from "./actions/lead-create.ts";
import leadGet from "./actions/lead-get.ts";
import leadGetMany from "./actions/lead-get-many.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadGetUnassigned from "./actions/lead-get-unassigned.ts";
import leadAddTag from "./actions/lead-add-tag.ts";
import leadLogActivity from "./actions/lead-log-activity.ts";

import leadCommentCreate from "./actions/lead-comment-create.ts";
import leadCommentGetMany from "./actions/lead-comment-get-many.ts";

import clientFolderCreate from "./actions/client-folder-create.ts";
import clientFolderGetMany from "./actions/client-folder-get-many.ts";

import userGet from "./actions/user-get.ts";
import userGetMany from "./actions/user-get-many.ts";

import teamGetMany from "./actions/team-get-many.ts";
import pipelineGetMany from "./actions/pipeline-get-many.ts";
import stepGetMany from "./actions/step-get-many.ts";
import categoryGetMany from "./actions/category-get-many.ts";
import predefinedTagGetMany from "./actions/predefined-tag-get-many.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookGetMany from "./actions/webhook-get-many.ts";

export default {
  actions: [
    // lead
    leadCreate,
    leadGet,
    leadGetMany,
    leadUpdate,
    leadDelete,
    leadGetUnassigned,
    leadAddTag,
    leadLogActivity,
    // comment
    leadCommentCreate,
    leadCommentGetMany,
    // client folder
    clientFolderCreate,
    clientFolderGetMany,
    // user
    userGet,
    userGetMany,
    // account reference data
    teamGetMany,
    pipelineGetMany,
    stepGetMany,
    categoryGetMany,
    predefinedTagGetMany,
    // webhook
    webhookCreate,
    webhookGetMany,
  ],
  auth: [apiKey, userToken],
  healthChecks: [subdomain, service, quota],
} satisfies AppDefinition;
