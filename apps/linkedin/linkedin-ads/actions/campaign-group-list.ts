import type { ActionDefinition } from "@w6w/types";
import { bareId, buildSearch, LinkedInAdsClient, triState } from "../lib/client.ts";
import {
  accountIdParam,
  campaignGroupStatusOptions,
  cursorPaginationParams,
  sortOrderParam,
  testFilterParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  ids?: string;
  names?: string;
  statuses?: string[];
  test?: string;
  sortOrder?: string;
  pageSize?: number;
  pageToken?: string;
}

const csv = (v: string | undefined): string[] | undefined =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * `GET /rest/adAccounts/{accountId}/adCampaignGroups?q=search` — search
 * criteria is mandatory per the vendor's doc (unlike Ad Accounts, an empty
 * filter set is not documented as "return everything"), so this action
 * always sends at least the account-scoped path; add id/name/status filters
 * to narrow further.
 */
const campaignGroupList: ActionDefinition<Input> = {
  key: "campaign-group-list",
  type: "search",
  resource: "campaign-group",
  title: "List Campaign Groups",
  description: "Search Campaign Groups within an Ad Account, by ID, name or status.",
  params: [
    accountIdParam,
    { key: "ids", label: "Campaign Group IDs", type: "string", hint: "Comma-separated." },
    { key: "names", label: "Names", type: "string", hint: "Comma-separated." },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: campaignGroupStatusOptions,
    },
    testFilterParam,
    sortOrderParam,
    ...cursorPaginationParams(50),
  ],
  output: [
    { key: "elements", type: "array", label: "Campaign groups" },
    { key: "metadata", type: "object", label: "Paging metadata (nextPageToken)" },
  ],

  execute(input, ctx) {
    const search = buildSearch([
      { field: "id", values: csv(input.ids) },
      { field: "name", values: csv(input.names) },
      { field: "status", values: input.statuses },
      { field: "test", scalar: triState(input.test) },
    ]);

    const client = new LinkedInAdsClient(ctx);
    return client.request(`/rest/adAccounts/${bareId(input.accountId)}/adCampaignGroups`, {
      query: {
        q: "search",
        search: search || undefined,
        sortOrder: input.sortOrder,
        pageSize: String(input.pageSize ?? 50),
        pageToken: input.pageToken,
      },
    });
  },
};

export default campaignGroupList;
