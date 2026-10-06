import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Get Order by External ID.
 *
 * `GET /orders/external/{externalId}` (Orders scope).
 */
interface Input {
  externalId: string;
}

const action: ActionDefinition<Input> = {
  key: "order-get-by-external-id",
  type: "read",
  resource: "order",
  title: "Get Order by External ID",
  description: "Fetch one order by the id it carries in your own system.",
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "The identifier the order carries in your own system (set when it was created).",
    },
  ],
  output: [
    { key: "order", type: "object", label: "The order" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get(
      `/orders/external/${encodeId(input.externalId)}`,
    ) as Record<string, unknown>;
    return { order: res.order ?? res };
  },
};

export default action;
