import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PrintfulClient } from "../lib/client.ts";
import { itemsParam, recipientParam } from "../lib/params.ts";

interface Input {
  recipient: unknown;
  items: unknown;
  shipping?: string;
}

/** `POST /orders/estimate-costs` — Estimate the costs of an order (items, shipping, tax) without creating it. */
const orderCostEstimate: ActionDefinition<Input> = {
  key: "order-cost-estimate",
  type: "perform",
  resource: "order",
  title: "Estimate Order Costs",
  description: "Estimate the costs of an order (items, shipping, tax) without creating it.",
  idempotent: true,
  params: [
    recipientParam,
    itemsParam,
    {
      key: "shipping",
      label: "Shipping method",
      type: "string",
      hint: "Shipping method id, e.g. `STANDARD`.",
    },
  ],
  output: [
    { key: "costs", type: "object", label: "Printful costs" },
    { key: "retail_costs", type: "object", label: "Retail costs" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "POST",
      "/orders/estimate-costs",
      {
        body: compact({
          shipping: input.shipping,
          recipient: jsonValue(input.recipient),
          items: jsonValue(input.items),
        }),
      },
    );
    return result ?? {};
  },
};

export default orderCostEstimate;
