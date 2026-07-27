import type { ActionDefinition } from "@w6w/types";
import { BOARD_FIELDS, MondayClient } from "../lib/client.ts";

const QUERY = `
  query GetBoard($ids: [ID!]) {
    boards(ids: $ids) {
      ${BOARD_FIELDS}
      owners { id }
    }
  }
`;

/** `boards(ids:)` always returns a list, so a single get is a one-element array. */
const boardGet: ActionDefinition<{ boardId: string }> = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get Board",
  description: "Get a single board by ID.",
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
  ],
  output: [{ key: "boards", type: "array", label: "Boards (one element)" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, { ids: [input.boardId] });
  },
};

export default boardGet;
