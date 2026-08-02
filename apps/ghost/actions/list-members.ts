import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  filter?: string;
  search?: string;
  order?: string;
  limit?: number;
  page?: number;
}

interface Output {
  items: unknown[];
  meta?: unknown;
}

const listMembers: ActionDefinition<Input, Output> = {
  key: "list-members",
  type: "read",
  resource: "member",
  title: "List Members",
  description: "List members on a single page of results. Set `page` to walk further pages.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Ghost NQL filter, e.g. `status:paid`.",
    },
    { key: "search", label: "Search", type: "string", hint: "Matches name or email." },
    { key: "order", label: "Order", type: "string", default: "created_at desc" },
    { key: "limit", label: "Limit", type: "number", default: 15 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Members" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    return client.browse("members", {
      filter: input.filter,
      search: input.search,
      order: input.order,
      limit: input.limit ?? 15,
      page: input.page ?? 1,
    });
  },
};

export default listMembers;
