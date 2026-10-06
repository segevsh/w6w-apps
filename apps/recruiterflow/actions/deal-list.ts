import type { ActionDefinition } from "@w6w/types";
import { asList, call, compact, flag, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  userId?: unknown;
  itemsPerPage?: unknown;
  currentPage?: unknown;
  includeCount?: unknown;
}

const dealList: ActionDefinition<Input> = {
  key: "deal-list",
  type: "read",
  title: "List Deals",
  description: "List deals owned by a user.",
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "itemsPerPage", label: "Items per page", type: "number", hint: "Records per page." },
    { key: "currentPage", label: "Page", type: "number", hint: "1-based page number." },
    {
      key: "includeCount",
      label: "Include total count",
      type: "boolean",
      hint: "Adds the total record count to the result.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(input, ctx) {
    const query = compact({
      "user_id": toInt(input.userId, "User ID"),
      "items_per_page": toInt(input.itemsPerPage, "Items per page"),
      "current_page": toInt(input.currentPage, "Page"),
      "include_count": flag(input.includeCount),
    }) as Record<string, QueryValue>;
    const res = await call(ctx, "/deals/list", { query });
    return asList(res);
  },
};

export default dealList;
