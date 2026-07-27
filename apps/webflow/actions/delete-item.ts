import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  itemId: string;
}

/**
 * DELETE /collections/{collection_id}/items/{item_id} — delete a CMS item.
 * Webflow answers 204 No Content, so the client returns `undefined`; this action
 * normalizes that to `{ success: true }` for downstream steps.
 */
const deleteItem: ActionDefinition<Input, { success: true }> = {
  key: "delete-item",
  type: "perform",
  resource: "collection-item",
  title: "Delete Collection Item",
  description: "Delete an item from a CMS collection.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new WebflowClient(ctx);
    await client.request(
      `/collections/${encodeURIComponent(input.collectionId)}/items/${
        encodeURIComponent(input.itemId)
      }`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteItem;
