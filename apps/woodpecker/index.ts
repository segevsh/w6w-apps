/**
 * Woodpecker: cold email and multichannel outreach (`api.woodpecker.co`).
 *
 * Every path, verb, parameter and body field was read on 2026-10-06 from the
 * reference at developers.woodpecker.co (the `.md` variant of each page) and probed
 * live without a credential. Findings that shaped the design:
 *
 *  1. **Two API versions in one product.** Campaign settings, mailboxes, users, inbox,
 *     blacklist, LinkedIn accounts and manual tasks are `/rest/v2`; prospects and the
 *     campaign list/statistics are still `/rest/v1` and answer errors in a different
 *     envelope (`{status: {code, msg}}`). `lib/client.ts` reads both.
 *  2. **The reference's own auth example is `GET /rest/v1/me`**, which is not a documented
 *     resource; the credential probe is the documented `GET /rest/v2/users` instead.
 *  3. **A v1 prospect import can fail inside a 200 body** (`status.status: "ERROR"`), so
 *     that is treated as a failure.
 *  4. **Concurrency, not quota.** One request at a time, six queued, then 429 per account.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignStatsGet from "./actions/campaign-stats-get.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import campaignRun from "./actions/campaign-run.ts";
import campaignPause from "./actions/campaign-pause.ts";
import campaignStop from "./actions/campaign-stop.ts";
import campaignDelete from "./actions/campaign-delete.ts";
import mailboxList from "./actions/mailbox-list.ts";
import mailboxGet from "./actions/mailbox-get.ts";
import mailboxUpdate from "./actions/mailbox-update.ts";
import userList from "./actions/user-list.ts";
import linkedinAccountList from "./actions/linkedin-account-list.ts";
import manualTaskList from "./actions/manual-task-list.ts";
import inboxMessageList from "./actions/inbox-message-list.ts";
import inboxMessageReply from "./actions/inbox-message-reply.ts";
import prospectResponseList from "./actions/prospect-response-list.ts";
import prospectList from "./actions/prospect-list.ts";
import prospectSearch from "./actions/prospect-search.ts";
import prospectAdd from "./actions/prospect-add.ts";
import prospectUpdate from "./actions/prospect-update.ts";
import prospectAddToCampaign from "./actions/prospect-add-to-campaign.ts";
import prospectUpdateInCampaign from "./actions/prospect-update-in-campaign.ts";
import prospectDelete from "./actions/prospect-delete.ts";
import blacklistDomainList from "./actions/blacklist-domain-list.ts";
import blacklistDomainAdd from "./actions/blacklist-domain-add.ts";
import blacklistDomainRemove from "./actions/blacklist-domain-remove.ts";
import blacklistEmailList from "./actions/blacklist-email-list.ts";
import blacklistEmailAdd from "./actions/blacklist-email-add.ts";
import blacklistEmailRemove from "./actions/blacklist-email-remove.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    campaignList,
    campaignStatsGet,
    campaignGet,
    campaignUpdate,
    campaignRun,
    campaignPause,
    campaignStop,
    campaignDelete,
    mailboxList,
    mailboxGet,
    mailboxUpdate,
    userList,
    linkedinAccountList,
    manualTaskList,
    inboxMessageList,
    inboxMessageReply,
    prospectResponseList,
    prospectList,
    prospectSearch,
    prospectAdd,
    prospectUpdate,
    prospectAddToCampaign,
    prospectUpdateInCampaign,
    prospectDelete,
    blacklistDomainList,
    blacklistDomainAdd,
    blacklistDomainRemove,
    blacklistEmailList,
    blacklistEmailAdd,
    blacklistEmailRemove,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
