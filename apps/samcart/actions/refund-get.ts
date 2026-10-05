import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/refunds/{refundId}` */
interface Input {
  refundId: number;
}

const refundGet: ActionDefinition<Input> = {
  key: "refund-get",
  type: "read",
  resource: "refund",
  title: "Get Refund",
  description: "One refund.",
  params: [
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
      "label": "Refund id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/refunds/${intId(input.refundId, "Refund ID")}`,
    );
  },
};

export default refundGet;
