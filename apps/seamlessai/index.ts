/**
 * Seamless.AI — B2B contact and company data: search the database, research
 * (enrich) the records you pick, and manage the lists, campaigns, tasks and
 * saved searches around them, over the Seamless.AI public API v2
 * (`api.seamless.ai/api/client/v2`).
 *
 * Every path, verb, parameter, body field and enum here was read on 2026-10-06
 * from the vendor's own OpenAPI documents (`docs.seamless.ai/openapi.json` for
 * v1, and the v2 document its reference pages are rendered from) and probed
 * live against `api.seamless.ai`. The credential was never available to this
 * build, so response shapes are the documented ones, not captured ones.
 *
 * Findings that shaped the design:
 *
 *  1. **The documented error body is not the wire body** (`lib/client.ts`).
 *     The spec says `{message}`; a bad key answers `401 {"msg":"Invalid token"}`
 *     and a missing one `401 {"msg":"Unauthorized"}`, and a 422 carries a vendor
 *     `code` (`insufficientCredits`, a missing licence). Both spellings are read.
 *  2. **Research is asynchronous** — `*-research` answers 202 with `requestIds`,
 *     and the result only exists once the matching `*-research-poll` reports
 *     `done`. Poll every 2-5 seconds; 60 requests per minute per endpoint.
 *  3. **The probe is `GET /credits`** (`auth/api-key.ts`): it needs a credential,
 *     spends none, and returns balances only.
 *  4. **No status page** — `status.seamless.ai` is Cloudflare-gated and
 *     `seamless.statuspage.io` is the unclaimed shell, so `service` is declared
 *     unavailable (`health/service.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactsSearch from "./actions/contacts-search.ts";
import companiesSearch from "./actions/companies-search.ts";
import locationsLookup from "./actions/locations-lookup.ts";
import contactsResearch from "./actions/contacts-research.ts";
import contactsResearchPoll from "./actions/contacts-research-poll.ts";
import companiesResearch from "./actions/companies-research.ts";
import companiesResearchPoll from "./actions/companies-research-poll.ts";
import contactsList from "./actions/contacts-list.ts";
import companiesList from "./actions/companies-list.ts";
import contactsListsUpdate from "./actions/contacts-lists-update.ts";
import companiesListsUpdate from "./actions/companies-lists-update.ts";
import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listCreate from "./actions/list-create.ts";
import listUpdate from "./actions/list-update.ts";
import listDelete from "./actions/list-delete.ts";
import savedSearchList from "./actions/saved-search-list.ts";
import savedSearchGet from "./actions/saved-search-get.ts";
import savedSearchCreate from "./actions/saved-search-create.ts";
import savedSearchDelete from "./actions/saved-search-delete.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignMetricsGet from "./actions/campaign-metrics-get.ts";
import campaignAction from "./actions/campaign-action.ts";
import campaignContactsList from "./actions/campaign-contacts-list.ts";
import campaignContactsAdd from "./actions/campaign-contacts-add.ts";
import campaignContactsRemove from "./actions/campaign-contacts-remove.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskAction from "./actions/task-action.ts";
import taskDelete from "./actions/task-delete.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import callLog from "./actions/call-log.ts";
import callDispositionsList from "./actions/call-dispositions-list.ts";
import callSentimentsList from "./actions/call-sentiments-list.ts";
import activityList from "./actions/activity-list.ts";
import contactStatusesList from "./actions/contact-statuses-list.ts";
import engagementStatusesList from "./actions/engagement-statuses-list.ts";
import emailAccountsList from "./actions/email-accounts-list.ts";
import creditsGet from "./actions/credits-get.ts";
import userGet from "./actions/user-get.ts";
import featuresGet from "./actions/features-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    contactsSearch,
    companiesSearch,
    locationsLookup,
    contactsResearch,
    contactsResearchPoll,
    companiesResearch,
    companiesResearchPoll,
    contactsList,
    companiesList,
    contactsListsUpdate,
    companiesListsUpdate,
    listList,
    listGet,
    listCreate,
    listUpdate,
    listDelete,
    savedSearchList,
    savedSearchGet,
    savedSearchCreate,
    savedSearchDelete,
    campaignList,
    campaignGet,
    campaignMetricsGet,
    campaignAction,
    campaignContactsList,
    campaignContactsAdd,
    campaignContactsRemove,
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskAction,
    taskDelete,
    templateList,
    templateGet,
    callLog,
    callDispositionsList,
    callSentimentsList,
    activityList,
    contactStatusesList,
    engagementStatusesList,
    emailAccountsList,
    creditsGet,
    userGet,
    featuresGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
