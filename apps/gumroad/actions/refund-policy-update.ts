import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `PUT /v2/refund_policy`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  refundPeriod: string;
  finePrint?: string;
}

const refundPolicyUpdate: ActionDefinition<Input> = {
  key: "refund-policy-update",
  type: "perform",
  resource: "account",
  title: "Update Refund Policy",
  description:
    "Update the account-level refund policy. Rejected when the account-level policy is not in effect; then set it per product. Needs the `edit_products` or `account` scope.",
  idempotent: true,
  params: [{
    "key": "refundPeriod",
    "label": "Refund period",
    "type": "select",
    "required": true,
    "options": [
      { "value": "none", "label": "none" },
      { "value": "7", "label": "7" },
      { "value": "14", "label": "14" },
      { "value": "30", "label": "30" },
      { "value": "183", "label": "183" },
    ],
  }, {
    "key": "finePrint",
    "label": "Fine print",
    "type": "text",
    "hint": "Max 3000 characters; HTML is stripped. Empty clears it.",
  }],
  output: [{ "key": "refund_period", "type": "string", "label": "Refund period" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("PUT", `/refund_policy`, {
      form: { refund_period: input.refundPeriod, fine_print: input.finePrint },
    });
    return body.refund_policy;
  },
};

export default refundPolicyUpdate;
