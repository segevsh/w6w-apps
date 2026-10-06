import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_FIELDS, orderUnion } from "../lib/fields.ts";

interface Input {
  orderId: string;
  statusId: string;
}

const orderStatusSet: ActionDefinition<Input> = {
  key: "order-status-set",
  type: "perform",
  resource: "order",
  title: "Set Order Status",
  description:
    "Set the status of a quote or invoice (statusUpdate). The status must be of the matching type; list them with List Statuses.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Quote or Invoice ID", type: "string", required: true },
    { key: "statusId", label: "Status ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "object", label: "New Status" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ statusUpdate: unknown }>(
      `mutation($parentId: ID!, $statusId: ID!) { statusUpdate(parentId: $parentId, statusId: $statusId) { ${
        orderUnion(ORDER_FIELDS)
      } } }`,
      { parentId: input.orderId, statusId: input.statusId },
    );
    return data.statusUpdate;
  },
};

export default orderStatusSet;
