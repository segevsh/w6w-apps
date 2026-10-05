import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/refund_policy`
 */
type Input = Record<string, never>;

const refundPolicyGet: ActionDefinition<Input> = {
  key: "refund-policy-get",
  type: "read",
  resource: "account",
  title: "Get Refund Policy",
  description: "The account-level refund policy.",
  params: [],
  output: [{ "key": "refund_period", "type": "string", "label": "Refund period" }, {
    "key": "in_effect",
    "type": "boolean",
    "label": "Whether the account-level policy applies",
  }],

  async execute(_input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/refund_policy`);
    return body.refund_policy;
  },
};

export default refundPolicyGet;
