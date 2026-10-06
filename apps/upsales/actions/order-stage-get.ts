import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/orderstages/{id}` — Fetch one order or opportunity stage by ID. */
interface Input {
  id: number;
}

const orderStageGet: ActionDefinition<Input> = {
  key: "order-stage-get",
  type: "read",
  resource: "order",
  title: "Get Order Stage",
  description: "Fetch one order or opportunity stage by ID.",
  params: [idParam("id", "Order Stage ID")],
  output: [{ key: "data", type: "object", label: "The order stage" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/orderstages/${encodeId(input.id)}`);
    return { data };
  },
};

export default orderStageGet;
