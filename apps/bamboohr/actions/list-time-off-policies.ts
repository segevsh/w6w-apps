import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

/**
 * `GET /api/v1/meta/time_off/policies` — the company's time off policies.
 *
 * The accrual rules behind the numbers Get Time Off Balance returns. Takes no
 * parameters: it is the whole company's policy list, and it is the lookup you
 * need to interpret a balance ("18.5 of what, accruing how").
 */
const listTimeOffPolicies: ActionDefinition<Record<string, never>> = {
  key: "list-time-off-policies",
  type: "search",
  resource: "time-off-policy",
  title: "List Time Off Policies",
  description:
    "List the company's time off policies — the accrual rules behind the balances returned by " +
    "Get Time Off Balance.",
  params: [],
  output: [{ key: "policies", type: "array", label: "Time off policies" }],

  execute(_input, ctx) {
    return new BambooClient(ctx).request("/meta/time_off/policies");
  },
};

export default listTimeOffPolicies;
