import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  id: string;
  idMember: string;
  type: string;
}

const boardAddMember: ActionDefinition<Input> = {
  key: "board-add-member",
  type: "perform",
  resource: "board",
  title: "Add Board Member",
  description: "Add a member to a board, or change the role of one already on it.",
  // Writes the member's role absolutely — re-running lands on the same state.
  idempotent: true,
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    { key: "idMember", label: "Member ID", type: "string", required: true },
    {
      key: "type",
      label: "Role",
      type: "select",
      required: true,
      default: "normal",
      options: [
        { value: "normal", label: "Normal" },
        { value: "admin", label: "Admin" },
        { value: "observer", label: "Observer" },
      ],
    },
  ],
  output: [{ key: "id", type: "string", label: "Board ID" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/boards/${encodeURIComponent(input.id)}/members/${encodeURIComponent(input.idMember)}`,
      { method: "PUT", query: { type: input.type } },
    );
  },
};

export default boardAddMember;
