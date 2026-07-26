import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const balanceGet: ActionDefinition<Record<string, never>> = {
  key: "balance-get",
  type: "read",
  resource: "balance",
  title: "Get Balance",
  description: "Retrieve the account's current balance, split into available and pending funds.",
  params: [],
  output: [
    { key: "available", type: "array", label: "Available funds, per currency" },
    { key: "pending", type: "array", label: "Pending funds, per currency" },
    { key: "livemode", type: "boolean", label: "Live mode" },
  ],

  execute(_input, ctx) {
    return new StripeClient(ctx).request("/balance");
  },
};

export default balanceGet;
