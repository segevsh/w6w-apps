import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

const QUERY = `
  query GetGroups($ids: [ID!]) {
    boards(ids: $ids) {
      id
      groups {
        id
        title
        color
        position
        archived
      }
    }
  }
`;

/**
 * Groups live under a board, so the query fetches the board and reads its
 * `groups`. The result is the board list (one element) — a caller reads
 * `boards[0].groups`. Each group's `id` is the `groupId` other actions want.
 */
const groupGetMany: ActionDefinition<{ boardId: string }> = {
  key: "group-get-many",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List the groups on a board, with their ids.",
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
  ],
  output: [{ key: "boards", type: "array", label: "Boards, each with `groups`" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, { ids: [input.boardId] });
  },
};

export default groupGetMany;
