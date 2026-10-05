import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/charges/{chargeId}/refunds` */
interface Input {
  chargeId: number;
}

const chargeRefundList: ActionDefinition<Input> = {
  key: "charge-refund-list",
  type: "read",
  resource: "charge",
  title: "List Charge Refunds",
  description: "Every refund issued against a charge.",
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
  ],
  output: [
    {
      "key": "data",
      "type": "array",
      "label": "The returned records",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "GET",
      `/charges/${intId(input.chargeId, "Charge ID")}/refunds`,
    );
    return { data: Array.isArray(body) ? body : [] };
  },
};

export default chargeRefundList;
