import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/campaigns` — List Campaigns. */
interface Input {
  searchText?: string;
  limit?: number;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List engagement campaigns. Requires the Engage feature on the account.",
  params: [
    { key: "searchText", label: "Search text", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/campaigns", {
      query: compact({
        searchText: input.searchText,
        limit: toInt(input.limit, "Limit"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default campaignList;
