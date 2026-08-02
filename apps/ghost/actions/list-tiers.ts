import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  filter?: string;
  limit?: number;
  page?: number;
}

interface Output {
  items: unknown[];
  meta?: unknown;
}

const listTiers: ActionDefinition<Input, Output> = {
  key: "list-tiers",
  type: "read",
  resource: "tier",
  title: "List Tiers",
  description: "List membership tiers (products) on a single page of results.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Ghost NQL filter, e.g. `active:true+type:paid`.",
    },
    { key: "limit", label: "Limit", type: "number", default: 15 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Tiers" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    return client.browse("tiers", {
      filter: input.filter,
      limit: input.limit ?? 15,
      page: input.page ?? 1,
    });
  },
};

export default listTiers;
