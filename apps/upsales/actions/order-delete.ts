import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/orders/{id}` — Delete a order or opportunity. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const orderDelete: ActionDefinition<Input> = {
  key: "order-delete",
  type: "perform",
  resource: "order",
  title: "Delete Order or Opportunity",
  description: "Delete a order or opportunity.",
  idempotent: true,
  params: [idParam("id", "Order or Opportunity ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/orders/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default orderDelete;
