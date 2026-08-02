import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { listFilters, pagination } from "../lib/params.ts";

interface Input {
  where?: string;
  orderBy?: string;
  startPosition?: number;
  maxResults?: number;
}

const vendorList: ActionDefinition<Input> = {
  key: "vendor-list",
  type: "read",
  resource: "vendor",
  title: "List Vendors",
  description: "List vendors via QuickBooks' query endpoint.",
  params: [...listFilters, ...pagination],
  output: [{ key: "QueryResponse", type: "object", label: "Query response" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).query("Vendor", {
      where: input.where,
      orderBy: input.orderBy,
      startPosition: input.startPosition,
      maxResults: input.maxResults,
    });
  },
};

export default vendorList;
