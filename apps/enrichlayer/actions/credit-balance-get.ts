import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

/** `GET /credit-balance` */
const creditBalanceGet: ActionDefinition<Record<string, never>> = {
  key: "credit-balance-get",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description: "Return the account's remaining API credits (free).",
  params: [],
  output: [
    { key: "creditBalance", type: "number", label: "Remaining credits" },
  ],

  async execute(_input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/credit-balance");
    return {
      creditBalance: (res as { credit_balance?: number }).credit_balance ?? null,
    };
  },
};

export default creditBalanceGet;
