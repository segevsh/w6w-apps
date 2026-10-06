import type { AppDefinition } from "@w6w/types";
import anchorList from "./actions/anchor-list.ts";
import backlinkBrokenList from "./actions/backlink-broken-list.ts";
import backlinkList from "./actions/backlink-list.ts";
import backlinksStatsGet from "./actions/backlinks-stats-get.ts";
import domainRatingGet from "./actions/domain-rating-get.ts";
import domainRatingHistory from "./actions/domain-rating-history.ts";
import keywordMatchingTermList from "./actions/keyword-matching-term-list.ts";
import keywordOverviewGet from "./actions/keyword-overview-get.ts";
import keywordRelatedTermList from "./actions/keyword-related-term-list.ts";
import metricsGet from "./actions/metrics-get.ts";
import organicCompetitorList from "./actions/organic-competitor-list.ts";
import organicKeywordList from "./actions/organic-keyword-list.ts";
import projectList from "./actions/project-list.ts";
import rankTrackerOverviewGet from "./actions/rank-tracker-overview-get.ts";
import referringDomainList from "./actions/referring-domain-list.ts";
import serpOverviewGet from "./actions/serp-overview-get.ts";
import siteAuditIssueList from "./actions/site-audit-issue-list.ts";
import siteAuditProjectList from "./actions/site-audit-project-list.ts";
import topPageList from "./actions/top-page-list.ts";
import usageGet from "./actions/usage-get.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * Ahrefs — SEO and search-intelligence data over the v3 REST API.
 * Findings that shaped this app (2026-10-06):
 *
 * - Bearer key; a bad key is 401 `["Error","Unauthorized"]`, a missing one 403
 *   `["Error","Forbidden"]` — a bare JSON array, not the documented `{error}` object.
 * - Every data call is a GET, requires a `select` column list, and is billed in API units;
 *   there is no offset, only `limit`.
 * - `limits-and-usage` is free, so it is the credential probe and the quota check.
 */
const app: AppDefinition = {
  actions: [
    usageGet,
    domainRatingGet,
    domainRatingHistory,
    backlinksStatsGet,
    metricsGet,
    backlinkList,
    backlinkBrokenList,
    referringDomainList,
    anchorList,
    organicKeywordList,
    topPageList,
    organicCompetitorList,
    keywordOverviewGet,
    keywordMatchingTermList,
    keywordRelatedTermList,
    serpOverviewGet,
    rankTrackerOverviewGet,
    projectList,
    siteAuditProjectList,
    siteAuditIssueList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
