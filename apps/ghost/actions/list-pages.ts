import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  filter?: string;
  order?: string;
  limit?: number;
  page?: number;
}

interface Output {
  items: unknown[];
  meta?: unknown;
}

const listPages: ActionDefinition<Input, Output> = {
  key: "list-pages",
  type: "read",
  resource: "page",
  title: "List Pages",
  description: "List pages on a single page of results. Set `page` to walk further pages.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Ghost NQL filter, e.g. `status:published`.",
    },
    { key: "order", label: "Order", type: "string", default: "published_at desc" },
    { key: "limit", label: "Limit", type: "number", default: 15 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Pages" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    return client.browse("pages", {
      filter: input.filter,
      order: input.order,
      limit: input.limit ?? 15,
      page: input.page ?? 1,
    });
  },
};

export default listPages;
