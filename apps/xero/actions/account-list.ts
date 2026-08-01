import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { listFilters } from "../lib/params.ts";

interface Input {
  where?: string;
  order?: string;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List the chart of accounts.",
  params: listFilters,
  output: [{ key: "Accounts", type: "array", label: "Accounts" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Accounts", {
      query: { where: input.where, order: input.order },
    });
  },
};

export default accountList;
