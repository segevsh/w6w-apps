import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * Check Order Return Eligibility.
 *
 * `POST /orders/return-eligibility` with `{order_name}`. A read despite the verb: it creates nothing.
 */
interface Input {
  orderName: string;
}

const action: ActionDefinition<Input> = {
  key: "order-return-eligibility",
  type: "read",
  resource: "order",
  title: "Check Order Return Eligibility",
  description: "Look up which items on an order are still eligible to be returned.",
  params: [
    {
      key: "orderName",
      label: "Order name",
      type: "string",
      required: true,
      hint: "The order name as the commerce provider shows it (e.g. `1001`).",
    },
  ],
  output: [
    {
      key: "return_eligibility",
      type: "object",
      label: "order_id, as_of, advisory and per-item eligibility",
    },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post("/orders/return-eligibility", {
      order_name: input.orderName,
    }) as Record<string, unknown>;
    return { return_eligibility: res.return_eligibility ?? res };
  },
};

export default action;
