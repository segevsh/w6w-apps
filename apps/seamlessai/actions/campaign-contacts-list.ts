import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, segment, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/campaigns/{id}/contacts` — List Campaign Contacts. */
interface Input {
  id: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

const campaignContactsList: ActionDefinition<Input> = {
  key: "campaign-contacts-list",
  type: "read",
  resource: "campaign",
  title: "List Campaign Contacts",
  description: "List the contacts enrolled in a campaign.",
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID from the matching list action.",
    },
    { key: "searchText", label: "Search text", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of results to skip.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "GET",
      `/campaigns/${segment(input.id, "Campaign ID")}/contacts`,
      {
        query: compact({
          searchText: input.searchText,
          limit: toInt(input.limit, "Limit"),
          offset: toInt(input.offset, "Offset"),
        }) as Record<string, string | number | boolean>,
      },
    );
  },
};

export default campaignContactsList;
