import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/orderstages/{id}` — Delete a order or opportunity stage. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const orderStageDelete: ActionDefinition<Input> = {
  key: "order-stage-delete",
  type: "perform",
  resource: "order",
  title: "Delete Order Stage",
  description: "Delete a order or opportunity stage.",
  idempotent: true,
  params: [idParam("id", "Order Stage ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/orderstages/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default orderStageDelete;
