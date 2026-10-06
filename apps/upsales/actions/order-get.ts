import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/orders/{id}` — Fetch one order or opportunity by ID. */
interface Input {
  id: number;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order or Opportunity",
  description: "Fetch one order or opportunity by ID.",
  params: [idParam("id", "Order or Opportunity ID")],
  output: [{ key: "data", type: "object", label: "The order or opportunity" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/orders/${encodeId(input.id)}`);
    return { data };
  },
};

export default orderGet;
