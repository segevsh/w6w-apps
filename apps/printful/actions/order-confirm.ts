import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

interface Input {
  orderId: string;
}

/** `POST /orders/{orderId}/confirm` — Approve a draft order for fulfillment. */
const orderConfirm: ActionDefinition<Input> = {
  key: "order-confirm",
  type: "perform",
  resource: "order",
  title: "Confirm Order",
  description:
    "Approve a draft order for fulfillment. The store owner is charged when it is submitted.",
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
      "POST",
      `/orders/${seg(input.orderId)}/confirm`,
    );
    return result ?? {};
  },
};

export default orderConfirm;
