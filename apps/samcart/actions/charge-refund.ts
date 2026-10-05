import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `POST /v1/refunds/charges/{chargeId}/` */
interface Input {
  chargeId: number;
  amount?: number;
}

const chargeRefund: ActionDefinition<Input> = {
  key: "charge-refund",
  type: "perform",
  resource: "refund",
  title: "Refund Charge",
  description:
    "Refund a charge, in full or for a partial amount. Not safe to retry: a repeated partial refund can refund again (a fully refunded charge answers 409).",
  idempotent: false,
  params: [
    {
      "key": "chargeId",
      "label": "Charge ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
    {
      "key": "amount",
      "label": "Amount",
      "type": "number",
      "hint": "Refund amount in cents. Leave empty to refund the full charge.",
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Refund id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "POST",
      `/refunds/charges/${intId(input.chargeId, "Charge ID")}/`,
      {
        json: {
          amount: input.amount,
        },
      },
    );
  },
};

export default chargeRefund;
