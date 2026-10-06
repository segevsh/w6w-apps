import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  include?: string;
  hasConnectedList?: boolean;
}

/** `GET /v1/web-visits/custom-feeds` — verified against the vendor OpenAPI document (2026-10-06). */
const customFeedList: ActionDefinition<Input> = {
  key: "custom-feed-list",
  type: "search",
  resource: "custom_feed",
  title: "List Custom Feeds",
  description: "List the saved website-visitor feeds (custom feeds) of an account.",
  params: [
    accountIdParam,
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated: `folder`, `connected_list`.",
    },
    { key: "hasConnectedList", label: "Only feeds with a connected list", type: "boolean" },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/web-visits/custom-feeds";
    const query = {
      account_id: input.accountId,
      include: input.include,
      "filter[has_connected_list]": input.hasConnectedList,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default customFeedList;
