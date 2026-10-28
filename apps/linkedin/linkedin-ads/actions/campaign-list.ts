import type { ActionDefinition } from "@w6w/types";
import {
  bareId,
  buildSearch,
  LinkedInAdsClient,
  sponsoredCampaignGroupUrn,
  triState,
} from "../lib/client.ts";
import {
  accountIdParam,
  campaignStatusOptions,
  campaignTypeOptions,
  cursorPaginationParams,
  sortOrderParam,
  testFilterParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignGroupIds?: string;
  ids?: string;
  names?: string;
  associatedEntities?: string;
  statuses?: string[];
  types?: string[];
  test?: string;
  sortOrder?: string;
  pageSize?: number;
  pageToken?: string;
}

const csv = (v: string | undefined): string[] | undefined =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * `GET /rest/adAccounts/{accountId}/adCampaigns?q=search` — search criteria
 * is mandatory (chain at least one filter). Note the >1,000-result behavior:
 * the vendor returns a plain `400 Request would return too many entities`
 * rather than truncating, so a broad, unfiltered search on a large account
 * needs a smaller `pageSize` set explicitly.
 */
const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "Search Campaigns within an Ad Account, by ID, Campaign Group, name, associated " +
    "entity, type or status.",
  params: [
    accountIdParam,
    {
      key: "campaignGroupIds",
      label: "Campaign Group IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "ids", label: "Campaign IDs", type: "string", hint: "Comma-separated." },
    { key: "names", label: "Names", type: "string", hint: "Comma-separated." },
    {
      key: "associatedEntities",
      label: "Associated entity URNs",
      type: "string",
      hint: "Comma-separated urn:li:organization:{id} etc.",
      advanced: true,
    },
    { key: "statuses", label: "Statuses", type: "multiselect", options: campaignStatusOptions },
    { key: "types", label: "Types", type: "multiselect", options: campaignTypeOptions },
    testFilterParam,
    sortOrderParam,
    ...cursorPaginationParams(50),
  ],
  output: [
    { key: "elements", type: "array", label: "Campaigns" },
    { key: "metadata", type: "object", label: "Paging metadata (nextPageToken)" },
  ],

  execute(input, ctx) {
    const search = buildSearch([
      {
        field: "campaignGroup",
        values: csv(input.campaignGroupIds)?.map(sponsoredCampaignGroupUrn),
      },
      { field: "id", values: csv(input.ids) },
      { field: "name", values: csv(input.names) },
      { field: "associatedEntity", values: csv(input.associatedEntities) },
      { field: "status", values: input.statuses },
      { field: "type", values: input.types },
      { field: "test", scalar: triState(input.test) },
    ]);
    if (!search) {
      throw new Error(
        "At least one search filter is required (LinkedIn's own restriction — an empty " +
          "search is not accepted for campaigns, unlike ad accounts).",
      );
    }

    const client = new LinkedInAdsClient(ctx);
    return client.request(`/rest/adAccounts/${bareId(input.accountId)}/adCampaigns`, {
      query: {
        q: "search",
        search,
        sortOrder: input.sortOrder,
        pageSize: String(input.pageSize ?? 50),
        pageToken: input.pageToken,
      },
    });
  },
};

export default campaignList;
