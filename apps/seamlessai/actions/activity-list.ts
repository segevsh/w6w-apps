import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/activity` — List Activity. */
interface Input {
  contactId?: number;
  campaignIdentifier?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "read",
  resource: "activity",
  title: "List Activity",
  description:
    "The engagement activity feed: emails, calls and other events, optionally for one contact or campaign.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", validation: { integer: true } },
    { key: "campaignIdentifier", label: "Campaign identifier", type: "string" },
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
    return await new SeamlessClient(ctx).request("GET", "/activity", {
      query: compact({
        contactId: toInt(input.contactId, "Contact ID"),
        campaignIdentifier: input.campaignIdentifier,
        searchText: input.searchText,
        limit: toInt(input.limit, "Limit"),
        offset: toInt(input.offset, "Offset"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default activityList;
