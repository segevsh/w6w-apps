import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/charges/{chargeId}/refunds/{refundId}` */
interface Input {
  chargeId: number;
  refundId: number;
}

const chargeRefundGet: ActionDefinition<Input> = {
  key: "charge-refund-get",
  type: "read",
  resource: "charge",
  title: "Get Charge Refund",
  description: "One refund of a charge.",
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
      "key": "refundId",
      "label": "Refund ID",
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
      "key": "id",
      "type": "number",
      "label": "Charge id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/charges/${intId(input.chargeId, "Charge ID")}/refunds/${
        intId(input.refundId, "Refund ID")
      }`,
    );
  },
};

export default chargeRefundGet;
