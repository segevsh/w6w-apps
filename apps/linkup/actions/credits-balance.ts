import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";

const creditsBalance: ActionDefinition<Record<string, never>, Record<string, unknown>> = {
  key: "credits-balance",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description: "Read the number of Linkup credits remaining on the account.",
  params: [],
  output: [{ key: "balance", type: "number", label: "Credits remaining" }],

  async execute(_input, ctx) {
    const body = await new LinkupClient(ctx).get<{ balance?: number }>("/v1/credits/balance");
    return { balance: body?.balance };
  },
};

export default creditsBalance;
