import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

const boardGetMembers: ActionDefinition<{ id: string }, unknown[]> = {
  key: "board-get-members",
  type: "read",
  resource: "board",
  title: "Get Board Members",
  description: "List the members of a board.",
  params: [{ key: "id", label: "Board ID", type: "string", required: true }],
  output: [{ key: "", type: "array", label: "Members" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request<unknown[]>(
      `/boards/${encodeURIComponent(input.id)}/members`,
    );
  },
};

export default boardGetMembers;
