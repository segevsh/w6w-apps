import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Get Customer.
 *
 * `GET /customers/{id}` (Customers scope).
 */
interface Input {
  customerId: number;
}

const action: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by Loop's customer ID.",
  params: [
    {
      key: "customerId",
      label: "Customer ID (Loop)",
      type: "number",
      required: true,
      hint: "Loop's numeric customer id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "customer", type: "object", label: "The customer" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get(`/customers/${encodeId(input.customerId)}`) as Record<
      string,
      unknown
    >;
    return { customer: res.customer ?? res };
  },
};

export default action;
