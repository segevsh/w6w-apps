import type { ActionDefinition } from "@w6w/types";
import { SamCartClient, seg } from "../lib/client.ts";

/** `GET /v1/orders/batch-add-to-order/{batchId}` */
interface Input {
  batchId: string;
}

const orderBatchAddStatus: ActionDefinition<Input> = {
  key: "order-batch-add-status",
  type: "read",
  resource: "order",
  title: "Get Batch Add Status",
  description: "The current status of a batch started by Batch Add Products to Orders.",
  params: [
    {
      "key": "batchId",
      "label": "Batch ID",
      "type": "string",
      "required": true,
      "hint": "The `batch_id` returned when the batch was accepted.",
    },
  ],
  output: [
    {
      "key": "response",
      "type": "object",
      "label": "The vendor response body (undocumented in the reference; null when empty)",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "GET",
      `/orders/batch-add-to-order/${seg(input.batchId)}`,
    );
    return { response: body };
  },
};

export default orderBatchAddStatus;
