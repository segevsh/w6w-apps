import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";
import { cursorParam, limitParam, PAGE_OUTPUT } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

/** `GET /accounts` — cursor pagination, default 100. Rate limit 300 requests per minute. */
const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "List accounts one cursor page at a time.",
  params: [cursorParam, limitParam()],
  output: [{ key: "accounts", type: "array", label: "Accounts on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("GET", "/accounts", {
      query: { cursor: input.cursor, limit: input.limit },
    });
    return { accounts: items, ...page };
  },
};

export default accountList;
