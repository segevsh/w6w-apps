import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/agreements/{id}` — Delete a subscription. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const subscriptionDelete: ActionDefinition<Input> = {
  key: "subscription-delete",
  type: "perform",
  resource: "subscription",
  title: "Delete Subscription",
  description: "Delete a subscription.",
  idempotent: true,
  params: [idParam("id", "Subscription ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/agreements/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default subscriptionDelete;
