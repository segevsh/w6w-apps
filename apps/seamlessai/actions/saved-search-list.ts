import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/saved-searches` — List Saved Searches. */
interface Input {
  type?: string;
}

const savedSearchList: ActionDefinition<Input> = {
  key: "saved-search-list",
  type: "read",
  resource: "saved-search",
  title: "List Saved Searches",
  description: "List saved searches, optionally of one type.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "contacts", label: "contacts" }, {
        value: "companies",
        label: "companies",
      }],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/saved-searches", {
      query: compact({ type: input.type }) as Record<string, string | number | boolean>,
    });
  },
};

export default savedSearchList;
