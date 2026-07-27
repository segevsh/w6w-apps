import type { ActionDefinition } from "@w6w/types";
import { jsonArg, MondayClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  itemId: string;
  columnValues: string;
}

const MUTATION = `
  mutation ChangeColumnValues($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
    change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
      id
      name
    }
  }
`;

/**
 * Updates several columns of an item at once. `columnValues` is a JSON object
 * keyed by column id — monday's `JSON` scalar wants it as a string, which
 * `jsonArg` validates and encodes.
 */
const itemChangeColumnValues: ActionDefinition<Input> = {
  key: "item-change-column-values",
  type: "perform",
  resource: "item",
  title: "Update Column Values",
  description: "Set multiple column values on an item.",
  // Same input, same result — safe to retry.
  idempotent: true,
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
    {
      key: "columnValues",
      label: "Column values (JSON)",
      type: "text",
      required: true,
      config: { multiline: true },
      hint:
        'JSON keyed by column id, e.g. {"status":{"label":"Working on it"},"date4":{"date":"2026-08-01"}}.',
    },
  ],
  output: [
    { key: "change_multiple_column_values.id", type: "string", label: "Item ID" },
    { key: "change_multiple_column_values.name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      boardId: input.boardId,
      itemId: input.itemId,
      columnValues: jsonArg(input.columnValues),
    });
  },
};

export default itemChangeColumnValues;
