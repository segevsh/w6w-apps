import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/templates` — List Templates. */
interface Input {
  searchText?: string;
  type?: string;
  limit?: number;
  page?: number;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List email and call-script templates.",
  params: [
    { key: "searchText", label: "Search text", type: "string" },
    { key: "type", label: "Type", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number, starting at 1.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
    { key: "supplementalData", type: "object", label: "total and hasMore" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/templates", {
      query: compact({
        searchText: input.searchText,
        type: input.type,
        limit: toInt(input.limit, "Limit"),
        page: toInt(input.page, "Page"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default templateList;
