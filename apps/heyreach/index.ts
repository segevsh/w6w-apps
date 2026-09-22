/**
 * HeyReach — LinkedIn outreach and automation for sales teams.
 *
 * The shape of the API is worth knowing before reading the actions, because it
 * breaks three habits that other apps in this pack have:
 *
 *  - **One host, one prefix**: `https://api.heyreach.io/api/public/...`. The
 *    OpenAPI document's own `servers[0].url` is the truncated string
 *    `"https://api"` — do not use it; the live host is `api.heyreach.io`
 *    (verified 2026-09-22).
 *  - **Collections are `POST` with the paging in the body** (`{ offset, limit,
 *    ...filters }`), not query parameters. Only the by-id reads and the campaign
 *    state changes take a query parameter, and `inbox/GetConversationsV3` is
 *    cursor-paged instead.
 *  - **A 401 is plain text**, `Missing API key` or `Invalid API key`, despite the
 *    document declaring a JSON error schema for it — and the two are
 *    indistinguishable by status code, so the *body* is the only discriminator.
 *
 * `lib/client.ts` holds what those facts force on the code; `auth/api-key.ts`
 * holds the one place the credential is read. Every path, verb, body field and
 * response field was read from the vendor's own OpenAPI 3.1 document
 * (`https://docs.heyreach.io/openapi.json`, 256,166 bytes, fetched in full) plus
 * live probes on 2026-09-22; where the document's machine-readable schema is a
 * generator artifact, the operation's own prose is used and the action says so.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

import checkApiKey from "./actions/check-api-key.ts";

import linkedinAccountList from "./actions/linkedin-account-list.ts";
import linkedinAccountGet from "./actions/linkedin-account-get.ts";
import linkedinAccountStatus from "./actions/linkedin-account-status.ts";

import listGetAll from "./actions/list-get-all.ts";
import listGet from "./actions/list-get.ts";
import listCreate from "./actions/list-create.ts";
import listAddLeads from "./actions/list-add-leads.ts";
import listGetLeads from "./actions/list-get-leads.ts";

import leadGet from "./actions/lead-get.ts";
import leadAddTags from "./actions/lead-add-tags.ts";
import leadGetTags from "./actions/lead-get-tags.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignStart from "./actions/campaign-start.ts";
import campaignPause from "./actions/campaign-pause.ts";
import campaignResume from "./actions/campaign-resume.ts";
import campaignAddLeads from "./actions/campaign-add-leads.ts";
import campaignGetLeads from "./actions/campaign-get-leads.ts";
import campaignGetSequence from "./actions/campaign-get-sequence.ts";

import statsGetOverall from "./actions/stats-get-overall.ts";
import statsGetByCampaign from "./actions/stats-get-by-campaign.ts";

import inboxGetConversations from "./actions/inbox-get-conversations.ts";
import inboxSendMessage from "./actions/inbox-send-message.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import blacklistGetLeads from "./actions/blacklist-get-leads.ts";
import blacklistAddLeads from "./actions/blacklist-add-leads.ts";

const app: AppDefinition = {
  actions: [
    // auth
    checkApiKey,
    // LinkedIn accounts
    linkedinAccountList,
    linkedinAccountGet,
    linkedinAccountStatus,
    // lists
    listGetAll,
    listGet,
    listCreate,
    listAddLeads,
    listGetLeads,
    // leads
    leadGet,
    leadAddTags,
    leadGetTags,
    // campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignStart,
    campaignPause,
    campaignResume,
    campaignAddLeads,
    campaignGetLeads,
    campaignGetSequence,
    // stats
    statsGetOverall,
    statsGetByCampaign,
    // inbox
    inboxGetConversations,
    inboxSendMessage,
    // webhooks
    webhookCreate,
    webhookList,
    webhookDelete,
    // blacklist
    blacklistGetLeads,
    blacklistAddLeads,
  ],
  auth: [apiKey],
  healthChecks: [api, service, quota],
};

export default app;
