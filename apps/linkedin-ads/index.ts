/**
 * LinkedIn Ads — the LinkedIn Marketing (Ads) API: Ad Accounts, Campaign
 * Groups, Campaigns, Creatives, Ad Analytics and Matched Audiences (DMP)
 * segments, over the versioned `/rest/` surface at `api.linkedin.com`.
 *
 * This is a **separate product** from the `linkedin` app in this pack,
 * which covers the member/social Posts API. They share a host and Rest.li
 * transport conventions but nothing else — different auth products
 * (Advertising API / Marketing Developer Platform vs. the free consumer
 * "Sign In with LinkedIn" scopes), different approval gates, different
 * resources. See `lib/client.ts` for the full transport findings and
 * `README.md` for what's covered and what's deliberately left out.
 *
 * Every endpoint, field and enum here was verified on 2026-08-15 against
 * Microsoft Learn's LinkedIn Marketing docs (`learn.microsoft.com/en-us/linkedin/marketing/`,
 * versioned view `li-lms-2026-07`) plus live, unauthenticated probes against
 * `api.linkedin.com`. Nothing here came from a third-party integration
 * directory.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2Audiences from "./auth/oauth2-audiences.ts";

import adAccountList from "./actions/ad-account-list.ts";
import adAccountGet from "./actions/ad-account-get.ts";
import adAccountCreate from "./actions/ad-account-create.ts";

import campaignGroupList from "./actions/campaign-group-list.ts";
import campaignGroupGet from "./actions/campaign-group-get.ts";
import campaignGroupCreate from "./actions/campaign-group-create.ts";
import campaignGroupUpdate from "./actions/campaign-group-update.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import campaignDelete from "./actions/campaign-delete.ts";

import creativeList from "./actions/creative-list.ts";
import creativeGet from "./actions/creative-get.ts";
import creativeCreate from "./actions/creative-create.ts";
import creativeUpdate from "./actions/creative-update.ts";

import analyticsGet from "./actions/analytics-get.ts";
import analyticsGetStatistics from "./actions/analytics-get-statistics.ts";

import audienceSegmentList from "./actions/audience-segment-list.ts";
import audienceSegmentGet from "./actions/audience-segment-get.ts";
import audienceSegmentCreate from "./actions/audience-segment-create.ts";
import audienceSegmentUpdate from "./actions/audience-segment-update.ts";
import audienceSegmentDelete from "./actions/audience-segment-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Ad Accounts
    adAccountList,
    adAccountGet,
    adAccountCreate,
    // Campaign Groups
    campaignGroupList,
    campaignGroupGet,
    campaignGroupCreate,
    campaignGroupUpdate,
    // Campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignUpdate,
    campaignDelete,
    // Creatives
    creativeList,
    creativeGet,
    creativeCreate,
    creativeUpdate,
    // Analytics
    analyticsGet,
    analyticsGetStatistics,
    // Audience segments (Matched Audiences)
    audienceSegmentList,
    audienceSegmentGet,
    audienceSegmentCreate,
    audienceSegmentUpdate,
    audienceSegmentDelete,
  ],
  // Two methods because LinkedIn's authorization endpoint rejects the whole
  // request if any requested scope isn't granted to the app, and the two
  // programs (Advertising API vs. Matched Audiences/Audiences) are approved
  // independently. See both files' doc comments.
  auth: [oauth2, oauth2Audiences],
  healthChecks: [service, quota],
} satisfies AppDefinition;
