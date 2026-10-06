import type { AppDefinition } from "@w6w/types";
import accountList from "./actions/account-list.ts";
import campaignList from "./actions/campaign-list.ts";
import companyFinancials from "./actions/company-financials.ts";
import companyGet from "./actions/company-get.ts";
import companyListAdd from "./actions/company-list-add.ts";
import companyMatch from "./actions/company-match.ts";
import companySearch from "./actions/company-search.ts";
import companyTagAssign from "./actions/company-tag-assign.ts";
import contactGet from "./actions/contact-get.ts";
import contactListAdd from "./actions/contact-list-add.ts";
import contactSearch from "./actions/contact-search.ts";
import customFeedList from "./actions/custom-feed-list.ts";
import ipEnrich from "./actions/ip-enrich.ts";
import listCreate from "./actions/list-create.ts";
import listDelete from "./actions/list-delete.ts";
import listGet from "./actions/list-get.ts";
import listItems from "./actions/list-items.ts";
import listList from "./actions/list-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import usageGet from "./actions/usage-get.ts";
import userGet from "./actions/user-get.ts";
import visitorCompanyList from "./actions/visitor-company-list.ts";
import webVisitSearch from "./actions/web-visit-search.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * Leadfeeder (now part of Dealfront) — website-visitor identification, company and contact
 * search, lists, tags and campaigns through the current `/v1` API.
 * Findings that shaped this app (2026-10-06):
 *
 * - `docs.leadfeeder.com/api/` documents the LEGACY API (`Authorization: Token token=…`, no new
 *   tokens issued). The current API is `/v1/*` on the same host, key in `X-Api-Key`.
 * - Nearly every route needs an `account_id` query parameter (List Accounts).
 * - Failures are `errors[0].code` bodies; search and match calls consume credits.
 */
const app: AppDefinition = {
  actions: [
    accountList,
    campaignList,
    companyFinancials,
    companyGet,
    companyListAdd,
    companyMatch,
    companySearch,
    companyTagAssign,
    contactGet,
    contactListAdd,
    contactSearch,
    customFeedList,
    ipEnrich,
    listCreate,
    listDelete,
    listGet,
    listItems,
    listList,
    tagCreate,
    tagList,
    usageGet,
    userGet,
    visitorCompanyList,
    webVisitSearch,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
