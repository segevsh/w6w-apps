import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

interface Input {
  itemId: string;
  groupId: string;
}

const MUTATION = `
  mutation MoveItem($groupId: String!, $itemId: ID!) {
    move_item_to_group(group_id: $groupId, item_id: $itemId) {
      id
    }
  }
`;

/**
 * Moves an item to a different group on the same board. `group_id` is monday's
 * string key (e.g. `topics`) — `group-get-many` lists them.
 */
const itemMove: ActionDefinition<Input> = {
  key: "item-move",
  type: "perform",
  resource: "item",
  title: "Move Item to Group",
  description: "Move an item to a different group on its board.",
  idempotent: true,
  params: [
    { key: "itemId", label: "Item ID", type: "string", required: true },
    { key: "groupId", label: "Target group ID", type: "string", required: true },
  ],
  output: [{ key: "move_item_to_group.id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      groupId: input.groupId,
      itemId: input.itemId,
    });
  },
};

export default itemMove;
