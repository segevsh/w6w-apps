import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

const MUTATION = `
  mutation DeleteItem($itemId: ID!) {
    delete_item(item_id: $itemId) {
      id
    }
  }
`;

/** Deleting an already-deleted item errors, but re-issuing the same delete is safe. */
const itemDelete: ActionDefinition<{ itemId: string }> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description: "Delete an item.",
  idempotent: true,
  params: [{ key: "itemId", label: "Item ID", type: "string", required: true }],
  output: [{ key: "delete_item.id", type: "string", label: "Deleted item ID" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, { itemId: input.itemId });
  },
};

export default itemDelete;
