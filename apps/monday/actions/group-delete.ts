import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  groupId: string;
}

const MUTATION = `
  mutation DeleteGroup($boardId: ID!, $groupId: String!) {
    delete_group(board_id: $boardId, group_id: $groupId) {
      id
      deleted
    }
  }
`;

/**
 * Deletes a group and every item in it. `group_id` is monday's string key
 * (e.g. `topics`), not a numeric id — `group-get-many` lists them.
 */
const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group and all its items. Deleting a missing group is a no-op.",
  idempotent: true,
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
    { key: "groupId", label: "Group ID", type: "string", required: true },
  ],
  output: [
    { key: "delete_group.id", type: "string", label: "Group ID" },
    { key: "delete_group.deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      boardId: input.boardId,
      groupId: input.groupId,
    });
  },
};

export default groupDelete;
