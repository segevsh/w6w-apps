import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import {
  accountIdParam,
  dataOutput,
  metaOutput,
  nextPageOutput,
  pageNumParam,
  pageSizeParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  include?: string;
  page?: number;
  pageSize?: number;
}

/** `GET /v1/campaigns` — verified against the vendor OpenAPI document (2026-10-06). */
const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List advertising campaigns, optionally with summary metrics, settings, locations, list and feed inlined.",
  params: [
    accountIdParam,
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated: `campaign_summary, campaign_settings, campaign_locations, list, custom_feed`.",
    },
    pageNumParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextPageOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/campaigns";
    const query = {
      account_id: input.accountId,
      "page[num]": input.page,
      "page[size]": input.pageSize,
      include: input.include,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default campaignList;
