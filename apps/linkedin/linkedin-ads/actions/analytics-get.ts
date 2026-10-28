import type { ActionDefinition } from "@w6w/types";
import {
  buildDateRange,
  LinkedInAdsClient,
  organizationUrn,
  parseAdsDate,
  restliList,
  sponsoredAccountUrn,
  sponsoredCampaignGroupUrn,
  sponsoredCampaignUrn,
} from "../lib/client.ts";
import { analyticsFieldsOptions, pivotOptions, timeGranularityOptions } from "../lib/params.ts";

type FacetType = "accounts" | "campaigns" | "campaignGroups" | "shares" | "companies";

interface Input {
  facetType: FacetType;
  facetIds: string;
  pivot?: string;
  dateStart: string;
  dateEnd?: string;
  timeGranularity: string;
  fields?: string[];
}

const csv = (v: string): string[] => v.split(",").map((s) => s.trim()).filter(Boolean);

function facetUrns(type: FacetType, ids: string[]): string[] {
  switch (type) {
    case "accounts":
      return ids.map(sponsoredAccountUrn);
    case "campaigns":
      return ids.map(sponsoredCampaignUrn);
    case "campaignGroups":
      return ids.map(sponsoredCampaignGroupUrn);
    case "companies":
      return ids.map(organizationUrn);
    case "shares":
      // Share/ugcPost URNs come in two kinds; pass through as typed.
      return ids;
  }
}

/**
 * `GET /rest/adAnalytics?q=analytics` — the Analytics Finder: one pivot
 * (grouping dimension) per query. See `analytics-get-statistics.ts` for up
 * to three pivots at once.
 *
 * Not pagination-friendly — the vendor documents `adAnalytics` as not
 * supporting pagination at all, and caps the response at 15,000 elements.
 * Also not cheap in bulk: a rolling 5-minute window caps total requested
 * `fields` × returned rows at 45,000,000, which is why `fields` here is a
 * bounded multiselect (max 20 per LinkedIn's own limit) rather than "return
 * everything".
 *
 * `dateRange`/`pivotValues` are always requested in addition to whatever
 * metrics are picked, since without them a row of numbers can't be
 * attributed to a date or an entity — LinkedIn returns only what `fields`
 * names, nothing implicitly.
 *
 * Retention differs by data kind: performance data (by account/campaign/
 * creative) keeps 10 years; professional-demographic pivots (the `MEMBER_*`
 * options) keep only 2 years, are approximate (privacy-protected), have a
 * minimum-3-events threshold per value, and — when `timeGranularity=ALL` —
 * a `dateRange` outside the 6-month daily-retention window gets silently
 * rounded to month boundaries.
 */
const analyticsGet: ActionDefinition<Input> = {
  key: "analytics-get",
  type: "read",
  resource: "analytics",
  title: "Get Analytics (single pivot)",
  description: "Performance or professional-demographic metrics, grouped by one dimension " +
    "(pivot), for a set of accounts, campaigns, campaign groups, shares or companies.",
  params: [
    {
      key: "facetType",
      label: "Facet",
      type: "select",
      required: true,
      default: "campaigns",
      options: [
        { value: "accounts", label: "Ad Accounts" },
        { value: "campaigns", label: "Campaigns" },
        { value: "campaignGroups", label: "Campaign Groups" },
        { value: "shares", label: "Shares / posts" },
        { value: "companies", label: "Advertiser's own companies" },
      ],
    },
    {
      key: "facetIds",
      label: "Facet IDs",
      type: "string",
      required: true,
      hint: "Comma-separated. For Shares, pass the full urn:li:share:{id} or urn:li:ugcPost:{id}.",
    },
    { key: "pivot", label: "Pivot (group by)", type: "select", options: pivotOptions },
    { key: "dateStart", label: "Start date", type: "date", required: true },
    { key: "dateEnd", label: "End date", type: "date", hint: "Leave empty for an open range." },
    {
      key: "timeGranularity",
      label: "Time granularity",
      type: "select",
      required: true,
      default: "ALL",
      options: timeGranularityOptions,
    },
    {
      key: "fields",
      label: "Metrics",
      type: "multiselect",
      options: analyticsFieldsOptions,
      hint: "Up to 20. dateRange and pivotValues are always included. Defaults to impressions " +
        "and clicks (LinkedIn's own default) when left empty.",
    },
  ],
  output: [
    { key: "elements", type: "array", label: "Rows" },
    {
      key: "paging",
      type: "object",
      label: "Paging (adAnalytics documents no pagination support)",
    },
  ],

  execute(input, ctx) {
    const start = parseAdsDate(input.dateStart)!;
    const end = parseAdsDate(input.dateEnd);
    const facet = facetUrns(input.facetType, csv(input.facetIds));
    if (facet.length === 0) throw new Error("At least one Facet ID is required.");

    const fields = input.fields?.length
      ? Array.from(new Set(["dateRange", "pivotValues", ...input.fields]))
      : undefined;

    const client = new LinkedInAdsClient(ctx);
    return client.request("/rest/adAnalytics", {
      query: {
        q: "analytics",
        pivot: input.pivot,
        timeGranularity: input.timeGranularity,
        dateRange: buildDateRange(start, end),
        [input.facetType]: restliList(facet),
        fields: fields?.join(","),
      },
    });
  },
};

export default analyticsGet;
