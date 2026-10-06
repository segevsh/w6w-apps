import type { ActionDefinition } from "@w6w/types";
import { PaystackClient } from "../lib/client.ts";

/** `GET /balance` — `data` is one `{currency, balance}` row per currency. */
const balanceGet: ActionDefinition<Record<string, never>> = {
  key: "balance-get",
  type: "read",
  resource: "balance",
  title: "Get Balance",
  description: "Read the integration's balance per currency (smallest unit).",
  params: [],
  output: [{ key: "balances", type: "array", label: "One {currency, balance} per currency" }],
  async execute(_input, ctx) {
    const balances = await new PaystackClient(ctx).data<unknown[]>("/balance");
    return { balances: Array.isArray(balances) ? balances : [] };
  },
};

export default balanceGet;
