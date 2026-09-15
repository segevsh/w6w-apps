import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  planId: string;
}

/**
 * `GET /plans/{plan_id}` — fetch a single plan.
 *
 * `planId` accepts Recurly's own ID with no prefix, or the plan's code
 * prefixed `code-` — see `lib/client.ts` module doc §3.
 */
const getPlan: ActionDefinition<Input> = {
  key: "get-plan",
  type: "read",
  resource: "plan",
  title: "Get Plan",
  description: "Fetch a single plan by Recurly ID or by code (prefixed `code-`).",
  params: [
    {
      key: "planId",
      label: "Plan ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or plan code prefixed `code-` (`code-gold`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Plan ID" },
    { key: "code", type: "string", label: "Plan code" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State (active / inactive)" },
    { key: "interval_unit", type: "string", label: "Billing interval unit" },
    { key: "interval_length", type: "number", label: "Billing interval length" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(`/plans/${pathId(input.planId)}`);
  },
};

export default getPlan;
