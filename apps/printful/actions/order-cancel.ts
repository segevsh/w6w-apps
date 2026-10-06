import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

interface Input {
  orderId: string;
}

/** `DELETE /orders/{orderId}` — Cancel a pending order or delete a draft. */
const orderCancel: ActionDefinition<Input> = {
  key: "order-cancel",
  type: "perform",
  resource: "order",
  title: "Cancel Order",
  description:
    "Cancel a pending order or delete a draft. The charged amount is returned to the store owner.",
  idempotent: true,
  params: [
    orderIdParam,
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "external_id", type: "string", label: "External ID" },
    { key: "status", type: "string", label: "Status (draft, pending, fulfilled, canceled…)" },
    { key: "shipping", type: "string", label: "Shipping method" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "retail_costs", type: "object", label: "Retail costs" },
    { key: "shipments", type: "array", label: "Shipments" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "DELETE",
      `/orders/${seg(input.orderId)}`,
    );
    return result ?? {};
  },
};

export default orderCancel;
