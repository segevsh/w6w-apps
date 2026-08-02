import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { listFilters, pagination } from "../lib/params.ts";

interface Input {
  where?: string;
  orderBy?: string;
  startPosition?: number;
  maxResults?: number;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List the chart of accounts.",
  params: [...listFilters, ...pagination],
  output: [{ key: "QueryResponse", type: "object", label: "Query response" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).query("Account", {
      where: input.where,
      orderBy: input.orderBy,
      startPosition: input.startPosition,
      maxResults: input.maxResults,
    });
  },
};

export default accountList;
