import type { ActionDefinition } from "@w6w/types";
import { jsonArg, MondayClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  itemName: string;
  groupId?: string;
  columnValues?: string;
}

const MUTATION = `
  mutation CreateItem($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
    create_item(
      board_id: $boardId
      group_id: $groupId
      item_name: $itemName
      column_values: $columnValues
    ) {
      id
      name
    }
  }
`;

const itemCreate: ActionDefinition<Input> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description: "Create an item on a board, optionally in a specific group and with column values.",
  idempotent: false,
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
    { key: "itemName", label: "Item name", type: "string", required: true },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Optional. Defaults to the board's top group. `group-get-many` lists them.",
    },
    {
      key: "columnValues",
      label: "Column values (JSON)",
      type: "text",
      config: { multiline: true },
      advanced: true,
      hint:
        'JSON keyed by column id, e.g. {"status":{"label":"Done"},"text8":"hi"}. See monday\'s column-values docs.',
    },
  ],
  output: [
    { key: "create_item.id", type: "string", label: "Item ID" },
    { key: "create_item.name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      boardId: input.boardId,
      groupId: input.groupId || undefined,
      itemName: input.itemName,
      columnValues: jsonArg(input.columnValues),
    });
  },
};

export default itemCreate;
