import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  force?: boolean;
}

const orderDelete: ActionDefinition<Input> = {
  key: "order-delete",
  type: "perform",
  resource: "order",
  title: "Delete Order",
  description: "Delete an order. Defaults to a permanent delete (`force`); unset to move to trash.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: true,
      hint: "Bypass trash and delete permanently.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "number", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request(`/orders/${input.orderId}`, {
      method: "DELETE",
      query: { force: input.force ?? true },
    });
  },
};

export default orderDelete;
