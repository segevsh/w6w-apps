import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  collection_id: string;
}

/** `DELETE /collections/{collection_id}` — deletes the grouping, not the templates (the docs state no response body). */
const action: ActionDefinition<Input, { id: string; deleted: true }> = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete Collection",
  description: "Delete a template collection. A repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "collection_id", label: "Collection ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = required(input.collection_id, "collection_id");
    await new PlacidClient(ctx).json(`/collections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { id, deleted: true };
  },
};

export default action;
