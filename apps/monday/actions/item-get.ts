import type { ActionDefinition } from "@w6w/types";
import { csv, ITEM_FIELDS, MondayClient } from "../lib/client.ts";

const QUERY = `
  query GetItems($ids: [ID!]) {
    items(ids: $ids) {
      ${ITEM_FIELDS}
    }
  }
`;

/**
 * `items(ids:)` takes a list, so this accepts one id or several comma-separated
 * and always returns an array.
 */
const itemGet: ActionDefinition<{ itemId: string }> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Get one or more items by ID, with their column values.",
  params: [
    {
      key: "itemId",
      label: "Item ID(s)",
      type: "string",
      required: true,
      hint: "A single id, or several comma-separated.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Items" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, { ids: csv(input.itemId) });
  },
};

export default itemGet;
