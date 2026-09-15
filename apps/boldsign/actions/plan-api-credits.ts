import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";

interface Output {
  BalanceCredits: number;
}

/**
 * `GET /v1/plan/apiCreditsCount` — the account's purchased API-credit
 * balance (a pay-as-you-go add-on separate from the plan's document
 * allotment). This is the same endpoint the `api-key` Auth uses to probe
 * credential liveness — exposed here too since a workflow may want to branch
 * on it directly (e.g. alert before it runs out).
 */
const planApiCredits: ActionDefinition<Record<string, never>, Output> = {
  key: "plan-api-credits",
  type: "read",
  resource: "account",
  title: "Get API Credit Balance",
  description: "Read the account's purchased API-credit balance.",
  output: [{ key: "BalanceCredits", type: "number", label: "Remaining API credits" }],

  execute(_input, ctx) {
    return new BoldSignClient(ctx).request("/plan/apiCreditsCount");
  },
};

export default planApiCredits;
