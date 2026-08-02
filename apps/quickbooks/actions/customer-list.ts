import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { listFilters, pagination } from "../lib/params.ts";

interface Input {
  where?: string;
  orderBy?: string;
  startPosition?: number;
  maxResults?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "List customers via QuickBooks' query endpoint.",
  params: [...listFilters, ...pagination],
  output: [{ key: "QueryResponse", type: "object", label: "Query response" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).query("Customer", {
      where: input.where,
      orderBy: input.orderBy,
      startPosition: input.startPosition,
      maxResults: input.maxResults,
    });
  },
};

export default customerList;
