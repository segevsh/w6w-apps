import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `GET /api/balance` — with `Accept: application/json` the answer is `{amount, currency}`. */
const balanceGet: ActionDefinition<Record<string, never>> = {
  key: "balance-get",
  type: "read",
  resource: "account",
  title: "Get Balance",
  description: "Read the account's current prepaid balance and its currency.",
  params: [],
  output: [
    { key: "amount", type: "number", label: "Balance" },
    { key: "currency", type: "string", label: "Currency code, e.g. EUR" },
  ],

  execute(_input, ctx) {
    return new SevenClient(ctx).request("GET", "/balance");
  },
};

export default balanceGet;
