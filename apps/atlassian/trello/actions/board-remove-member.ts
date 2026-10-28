import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  id: string;
  idMember: string;
}

const boardRemoveMember: ActionDefinition<Input> = {
  key: "board-remove-member",
  type: "perform",
  resource: "board",
  title: "Remove Board Member",
  description: "Remove a member from a board.",
  idempotent: true,
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    { key: "idMember", label: "Member ID", type: "string", required: true },
  ],
  output: [{ key: "", type: "array", label: "Remaining members" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/boards/${encodeURIComponent(input.id)}/members/${encodeURIComponent(input.idMember)}`,
      { method: "DELETE" },
    );
  },
};

export default boardRemoveMember;
