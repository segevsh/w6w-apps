/**
 * Freshservice — Freshworks' ITSM / service-desk product.
 *
 * Built against the live v2 reference at <https://api.freshservice.com>, not
 * from memory: every path, envelope key and enum below is quoted from that
 * document.
 *
 * The thing that shapes this app is that **every account has its own host** —
 * `acme.freshservice.com`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.freshservice.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *     The apex is safe to pin because the v2 docs state the API "works only
 *     via Freshservice domains and not via custom CNAMEs".
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * The second shaping fact is the **resource-keyed envelope**: v2 wraps every
 * payload under the resource name (`{ "ticket": … }`, `{ "tickets": [ … ] }`).
 * `FreshserviceClient.resource()` unwraps it once so 23 actions do not each
 * repeat the same dance.
 *
 * Deliberately absent, and why:
 *
 *   - **Attachments.** Every attachment endpoint is `multipart/form-data`, and
 *     the docs are explicit that "only files on your local machine can be
 *     attached" — there is no URL-ingest form. A sandboxed hook has no local
 *     filesystem to attach from.
 *   - **Approvals, CABs, on-call schedules, projects, onboarding/offboarding
 *     journeys, purchase orders, contracts, software, alerts.** Real surfaces,
 *     but each is a module in its own right; shipping them half-covered would
 *     be worse than not shipping them.
 *   - **The ITAM `/api/v2/itam/assets` surface.** It is the successor for
 *     signups after 31 March 2026 and is not interchangeable with
 *     `/api/v2/assets`; picking the wrong one per account is a decision this
 *     app cannot make for the user yet.
 *   - **Triggers.** The webhook surface is a Trigger, not an Action.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import ticketCreate from "./actions/ticket-create.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketGetMany from "./actions/ticket-get-many.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketRestore from "./actions/ticket-restore.ts";

import ticketAddNote from "./actions/ticket-add-note.ts";
import ticketAddReply from "./actions/ticket-add-reply.ts";
import conversationGetMany from "./actions/conversation-get-many.ts";

import problemGetMany from "./actions/problem-get-many.ts";
import changeCreate from "./actions/change-create.ts";
import changeGetMany from "./actions/change-get-many.ts";
import releaseGetMany from "./actions/release-get-many.ts";

import requesterGetMany from "./actions/requester-get-many.ts";
import agentGetMany from "./actions/agent-get-many.ts";
import groupGetMany from "./actions/group-get-many.ts";
import departmentGetMany from "./actions/department-get-many.ts";
import locationGetMany from "./actions/location-get-many.ts";

import assetCreate from "./actions/asset-create.ts";
import assetGet from "./actions/asset-get.ts";
import assetGetMany from "./actions/asset-get-many.ts";

import serviceItemGetMany from "./actions/service-item-get-many.ts";
import solutionArticleSearch from "./actions/solution-article-search.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    // ticket
    ticketCreate,
    ticketGet,
    ticketGetMany,
    ticketUpdate,
    ticketDelete,
    ticketRestore,
    // conversation
    ticketAddNote,
    ticketAddReply,
    conversationGetMany,
    // problem / change / release
    problemGetMany,
    changeCreate,
    changeGetMany,
    releaseGetMany,
    // people and org
    requesterGetMany,
    agentGetMany,
    groupGetMany,
    departmentGetMany,
    locationGetMany,
    // assets
    assetCreate,
    assetGet,
    assetGetMany,
    // catalog and knowledge base
    serviceItemGetMany,
    solutionArticleSearch,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;
