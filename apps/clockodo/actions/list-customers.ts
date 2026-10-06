import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, pagingQuery } from "../lib/client.ts";

interface Input {
  fulltext?: string;
  active?: boolean;
  page?: number | string;
  itemsPerPage?: number | string;
}

const listCustomers: ActionDefinition<Input> = {
  key: "list-customers",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers (GET /v3/customers), filterable by active state and a full-text search. Paged.",
  params: [
    {
      key: "fulltext",
      label: "Search text",
      type: "string",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "true = active only, false = inactive only; leave unset for both.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number.",
    },
    {
      key: "itemsPerPage",
      label: "Items per page",
      type: "number",
      hint: "Page size.",
    },
  ],
  output: [
    {
      key: "paging",
      type: "object",
      label: "{ items_per_page, current_page, count_pages, count_items }",
    },
    { key: "data", type: "array", label: "Customers" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v3/customers", {
      query: {
        filter: {
          active: input.active,
          fulltext: input.fulltext,
        },
        ...pagingQuery(input),
      },
    });
    return { paging: body.paging ?? null, data: Array.isArray(body.data) ? body.data : [] };
  },
};

export default listCustomers;
