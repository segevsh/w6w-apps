import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  orderId: number;
  note?: string;
  tags?: string;
  email?: string;
  phone?: string;
}

const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description:
    "Update an order's note, tags or contact details. Line items and totals are immutable.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "number", required: true },
    { key: "note", label: "Note", type: "text", config: { multiline: true } },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES the order's current tags.",
    },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
  ],
  output: [
    { key: "order.id", type: "number", label: "Order ID" },
    { key: "order.tags", type: "string", label: "Tags" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/orders/${input.orderId}.json`, {
      method: "PUT",
      body: {
        order: {
          id: input.orderId,
          note: unset(input.note),
          tags: unset(input.tags),
          email: unset(input.email),
          phone: unset(input.phone),
        },
      },
    });
  },
};

export default orderUpdate;
