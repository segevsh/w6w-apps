import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and enum option lists for the LinkedIn Ads
 * actions. Every enum here is transcribed from Microsoft Learn's LinkedIn
 * Marketing docs (`li-lms-2026-07` view, read 2026-08-15), not inferred.
 */

/** Cursor pagination, shared by every `q=search` / `q=criteria` finder. */
export function cursorPaginationParams(defaultPageSize: number, maxPageSize = 1000): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 1, max: maxPageSize },
      hint: `Number of results per page. Max ${maxPageSize}.`,
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "From the previous response's metadata.nextPageToken. Leave empty for the first page.",
    },
  ];
}

export const sortOrderParam: Param = {
  key: "sortOrder",
  label: "Sort order",
  type: "select",
  options: [
    { value: "ASCENDING", label: "Ascending (default) — by ID" },
    { value: "DESCENDING", label: "Descending — by ID" },
  ],
};

/**
 * The `search.test` tri-state every search finder documents: unset returns
 * both test and non-test entities, `true`/`false` filters to one.
 */
export const testFilterParam: Param = {
  key: "test",
  label: "Test accounts",
  type: "select",
  options: [
    { value: "true", label: "Test accounts only" },
    { value: "false", label: "Non-test accounts only" },
  ],
  hint: "Leave empty to return both. A LinkedIn Test Account is created from Campaign Manager " +
    "for building and QA'ing integrations without spending real budget.",
};

export const accountIdParam: Param = {
  key: "accountId",
  label: "Ad Account ID",
  type: "string",
  required: true,
  placeholder: "512352200",
  hint: "The numeric Ad Account ID (from ad-account-list, or Campaign Manager's URL). Also " +
    "accepts the full urn:li:sponsoredAccount:{id} form.",
};

export const campaignGroupIdParam: Param = {
  key: "campaignGroupId",
  label: "Campaign Group ID",
  type: "string",
  required: true,
  hint: "The numeric Campaign Group ID. Also accepts urn:li:sponsoredCampaignGroup:{id}.",
};

export const campaignIdParam: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "string",
  required: true,
  hint: "The numeric Campaign ID. Also accepts urn:li:sponsoredCampaign:{id}.",
};

export const creativeIdParam: Param = {
  key: "creativeId",
  label: "Creative ID",
  type: "string",
  required: true,
  placeholder: "urn:li:sponsoredCreative:120491345",
  hint: "The full urn:li:sponsoredCreative:{id} — taken from the x-restli-id header a create " +
    "returns, or from creative-list/creative-get. Unlike other ids here, LinkedIn addresses a " +
    "creative by its full URN, not a bare number.",
};

/** A comma-separated free-text field the action splits into a search values list. */
export function csvListParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", hint: `${hint} Comma-separated for more than one.` };
}

export function moneyParams(prefix: string, label: string, hint: string): Param[] {
  return [
    {
      key: `${prefix}Amount`,
      label: `${label} amount`,
      type: "number",
      hint,
    },
    {
      key: `${prefix}Currency`,
      label: `${label} currency`,
      type: "string",
      default: "USD",
      placeholder: "USD",
      hint: "ISO currency code. Must match the parent Ad Account's currency.",
    },
  ];
}

// -------------------------------------------------------------- Accounts --

export const accountStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "REMOVED", label: "Removed" },
];

/** `type` can only be created as BUSINESS via the API; ENTERPRISE is LinkedIn-internal only. */
export const accountTypeOptions = [
  { value: "BUSINESS", label: "Business" },
  { value: "ENTERPRISE", label: "Enterprise (LinkedIn-internal — not creatable via API)" },
];

// --------------------------------------------------------- Campaign Groups //

export const campaignGroupStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "CANCELLED", label: "Cancelled (not settable — terminal)" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Paused" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "REMOVED", label: "Removed" },
];

// ------------------------------------------------------------- Campaigns --

export const campaignStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "REMOVED", label: "Removed" },
];

export const campaignTypeOptions = [
  { value: "TEXT_AD", label: "Text Ad" },
  { value: "SPONSORED_UPDATES", label: "Sponsored Content" },
  { value: "SPONSORED_INMAILS", label: "Message / Conversation Ads" },
  { value: "DYNAMIC", label: "Dynamic Ads (Follower, Spotlight, Jobs)" },
];

export const costTypeOptions = [
  { value: "CPM", label: "CPM — cost per 1,000 impressions" },
  { value: "CPC", label: "CPC — cost per click" },
  { value: "CPV", label: "CPV — cost per video view" },
];

export const objectiveTypeOptions = [
  { value: "BRAND_AWARENESS", label: "Brand awareness" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "JOB_APPLICANTS", label: "Job applicants" },
  { value: "LEAD_GENERATION", label: "Lead generation" },
  { value: "WEBSITE_CONVERSIONS", label: "Website conversions" },
  { value: "WEBSITE_VISITS", label: "Website visits" },
  { value: "VIDEO_VIEWS", label: "Video views" },
];

export const creativeSelectionOptions = [
  { value: "OPTIMIZED", label: "Optimized (default) — bias toward expected performance" },
  { value: "ROUND_ROBIN", label: "Round robin — rotate evenly" },
];

// -------------------------------------------------------------- Creatives //

/**
 * `intendedStatus` — independent of the parent campaign's status; the more
 * restrictive of the two wins for whether the creative actually serves.
 */
export const creativeIntendedStatusOptions = [
  { value: "ACTIVE", label: "Active — available for review and can be served" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "REMOVED", label: "Removed" },
];

// ------------------------------------------------------------- Analytics --

/**
 * `pivot` — grouping dimension for the Analytics Finder (single pivot) and
 * Statistics Finder (up to 3). The professional-demographic members
 * (`MEMBER_*`) carry the 2-year retention and accuracy caveats documented in
 * `actions/analytics-get.ts`.
 */
export const pivotOptions = [
  { value: "ACCOUNT", label: "Account" },
  { value: "CAMPAIGN_GROUP", label: "Campaign group" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "CREATIVE", label: "Creative" },
  { value: "COMPANY", label: "Advertiser's company" },
  { value: "SHARE", label: "Sponsored share" },
  { value: "CONVERSION", label: "Conversion" },
  { value: "CARD_INDEX", label: "Carousel card index" },
  { value: "SERVING_LOCATION", label: "Serving location (onsite/offsite)" },
  { value: "PLACEMENT_NAME", label: "Placement" },
  { value: "IMPRESSION_DEVICE_TYPE", label: "Impression device type" },
  { value: "MEMBER_COMPANY", label: "Member company (professional demographic)" },
  { value: "MEMBER_COMPANY_SIZE", label: "Member company size (professional demographic)" },
  { value: "MEMBER_INDUSTRY", label: "Member industry (professional demographic)" },
  { value: "MEMBER_SENIORITY", label: "Member seniority (professional demographic)" },
  { value: "MEMBER_JOB_TITLE", label: "Member job title (professional demographic)" },
  { value: "MEMBER_JOB_FUNCTION", label: "Member job function (professional demographic)" },
  { value: "MEMBER_COUNTRY_V2", label: "Member country (professional demographic)" },
  { value: "MEMBER_REGION_V2", label: "Member region (professional demographic)" },
];

export const timeGranularityOptions = [
  { value: "ALL", label: "All — one result across the whole range" },
  { value: "DAILY", label: "Daily" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

/**
 * The metric fields this app requests via `fields=`. LinkedIn returns only
 * `impressions` and `clicks` by default and caps a request at 20 metrics;
 * this is a deliberately small, broadly-useful subset rather than all of
 * them — see the README for what's left out and why.
 */
export const analyticsFieldsOptions = [
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "costInLocalCurrency", label: "Cost (local currency)" },
  { value: "costInUsd", label: "Cost (USD)" },
  { value: "landingPageClicks", label: "Landing page clicks" },
  { value: "externalWebsiteConversions", label: "External website conversions" },
  { value: "oneClickLeads", label: "One-click leads" },
  { value: "reactions", label: "Reactions" },
  { value: "shares", label: "Shares" },
  { value: "comments", label: "Comments" },
  { value: "follows", label: "Follows" },
  { value: "videoViews", label: "Video views" },
  { value: "videoCompletions", label: "Video completions" },
  { value: "opens", label: "Opens (Message/Conversation Ads)" },
  { value: "sends", label: "Sends (Message/Conversation Ads)" },
];

// ------------------------------------------------------ Audience segments //

export const dmpSegmentTypeOptions = [
  { value: "USER", label: "User (streaming)" },
  { value: "COMPANY", label: "Company (streaming)" },
  { value: "USER_LIST_UPLOAD", label: "User (CSV list upload)" },
  { value: "COMPANY_LIST_UPLOAD", label: "Company (CSV list upload)" },
];

export const dmpSourcePlatformOptions = [
  {
    value: "DIRECT_API",
    label: "Direct API — a LinkedIn advertiser using Matched Audiences for its own account(s)",
  },
  { value: "AGENCY_API", label: "Agency API — an agency managing audiences for multiple clients" },
  {
    value: "PARTNER_API",
    label: "Partner API — a platform syncing audiences at scale for many advertisers",
  },
  { value: "LIST_UPLOAD", label: "List upload — CSV-sourced segments (not created by this app)" },
];
