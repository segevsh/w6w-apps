import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Get Customer by External ID.
 *
 * `GET /customers/external/{externalId}` (Customers scope).
 */
interface Input {
  externalId: string;
}

const action: ActionDefinition<Input> = {
  key: "customer-get-by-external-id",
  type: "read",
  resource: "customer",
  title: "Get Customer by External ID",
  description: "Fetch one customer by the id they carry in your own system.",
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "The identifier the customer carries in your own system (set when it was created).",
    },
  ],
  output: [
    { key: "customer", type: "object", label: "The customer" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get(
      `/customers/external/${encodeId(input.externalId)}`,
    ) as Record<string, unknown>;
    return { customer: res.customer ?? res };
  },
};

export default action;
