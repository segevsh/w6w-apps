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
  pivots: string[];
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
      return ids;
  }
}

/**
 * `GET /rest/adAnalytics?q=statistics` — the Statistics Finder: up to three
 * pivots cross-tabulated in one query (e.g. campaign × device type), where
 * the single-pivot Analytics Finder (`analytics-get.ts`) only groups by one.
 * Same retention, throttling and 15,000-element cap; see that file's doc
 * comment for the shared detail this one doesn't repeat.
 */
const analyticsGetStatistics: ActionDefinition<Input> = {
  key: "analytics-get-statistics",
  type: "read",
  resource: "analytics",
  title: "Get Analytics (up to 3 pivots)",
  description: "Performance metrics cross-tabulated by up to three grouping dimensions at once.",
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
    {
      key: "pivots",
      label: "Pivots (group by, up to 3)",
      type: "multiselect",
      required: true,
      options: pivotOptions,
    },
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
      hint: "Up to 20. dateRange and pivotValues are always included.",
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
    if (!input.pivots?.length || input.pivots.length > 3) {
      throw new Error("Pivots: choose between 1 and 3.");
    }
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
        q: "statistics",
        pivots: restliList(input.pivots),
        timeGranularity: input.timeGranularity,
        dateRange: buildDateRange(start, end),
        [input.facetType]: restliList(facet),
        fields: fields?.join(","),
      },
    });
  },
};

export default analyticsGetStatistics;
