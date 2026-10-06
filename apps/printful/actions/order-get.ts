import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

interface Input {
  orderId: string;
}

/** `GET /orders/{orderId}` — Get one order by id or external id. */
const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Get one order by id or external id.",
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
      "GET",
      `/orders/${seg(input.orderId)}`,
    );
    return result ?? {};
  },
};

export default orderGet;
