import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  name: string;
}

const MUTATION = `
  mutation CreateGroup($boardId: ID!, $groupName: String!) {
    create_group(board_id: $boardId, group_name: $groupName) {
      id
      title
    }
  }
`;

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a group (section) on a board.",
  idempotent: false,
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
    { key: "name", label: "Group name", type: "string", required: true },
  ],
  output: [
    { key: "create_group.id", type: "string", label: "Group ID" },
    { key: "create_group.title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      boardId: input.boardId,
      groupName: input.name,
    });
  },
};

export default groupCreate;
