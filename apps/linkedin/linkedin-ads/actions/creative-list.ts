import type { ActionDefinition } from "@w6w/types";
import {
  bareId,
  LinkedInAdsClient,
  restliList,
  sponsoredCampaignUrn,
  sponsoredCreativeUrn,
} from "../lib/client.ts";
import {
  accountIdParam,
  creativeIntendedStatusOptions,
  cursorPaginationParams,
  sortOrderParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignIds?: string;
  creativeIds?: string;
  contentReferences?: string;
  intendedStatuses?: string[];
  isTestAccount?: string;
  sortOrder?: string;
  pageSize?: number;
  pageToken?: string;
}

const csv = (v: string | undefined): string[] | undefined =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * `GET /rest/adAccounts/{accountId}/creatives?q=criteria` — the Creatives
 * Finder. Unlike the `q=search` finders above, each filter is its own
 * top-level query param (`campaigns=List(...)`, `creatives=List(...)`, …)
 * rather than nested inside a `search=(...)` document — a different Rest.li
 * shape for what reads like the same kind of query. `X-RestLi-Method:
 * FINDER` is required.
 */
const creativeList: ActionDefinition<Input> = {
  key: "creative-list",
  type: "search",
  resource: "creative",
  title: "List Creatives",
  description: "Search Creatives within an Ad Account, by campaign, creative ID, content " +
    "reference or intended status.",
  params: [
    accountIdParam,
    { key: "campaignIds", label: "Campaign IDs", type: "string", hint: "Comma-separated." },
    {
      key: "creativeIds",
      label: "Creative URNs",
      type: "string",
      hint: "Comma-separated urn:li:sponsoredCreative:{id} values.",
    },
    {
      key: "contentReferences",
      label: "Content reference URNs",
      type: "string",
      hint: "Comma-separated urn:li:share:{id} or urn:li:ugcPost:{id} values.",
    },
    {
      key: "intendedStatuses",
      label: "Intended statuses",
      type: "multiselect",
      options: creativeIntendedStatusOptions,
    },
    {
      key: "isTestAccount",
      label: "Test account",
      type: "select",
      options: [
        { value: "true", label: "Test accounts only" },
        { value: "false", label: "Non-test accounts only" },
      ],
      hint: "Leave empty to return creatives regardless of the account being test or non-test.",
    },
    sortOrderParam,
    ...cursorPaginationParams(50, 100),
  ],
  output: [
    { key: "elements", type: "array", label: "Creatives" },
    { key: "metadata", type: "object", label: "Paging metadata (nextPageToken)" },
  ],

  execute(input, ctx) {
    const campaigns = csv(input.campaignIds)?.map(sponsoredCampaignUrn);
    const creatives = csv(input.creativeIds)?.map(sponsoredCreativeUrn);
    const contentReferences = csv(input.contentReferences);

    const client = new LinkedInAdsClient(ctx);
    return client.request(`/rest/adAccounts/${bareId(input.accountId)}/creatives`, {
      restliMethod: "FINDER",
      query: {
        q: "criteria",
        campaigns: campaigns ? restliList(campaigns) : undefined,
        creatives: creatives ? restliList(creatives) : undefined,
        contentReferences: contentReferences ? restliList(contentReferences) : undefined,
        intendedStatuses: input.intendedStatuses?.length
          ? restliList(input.intendedStatuses)
          : undefined,
        isTestAccount: input.isTestAccount,
        sortOrder: input.sortOrder,
        pageSize: String(input.pageSize ?? 50),
        pageToken: input.pageToken,
      },
    });
  },
};

export default creativeList;
