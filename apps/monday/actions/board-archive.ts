import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

const MUTATION = `
  mutation ArchiveBoard($id: ID!) {
    archive_board(board_id: $id) {
      id
      state
    }
  }
`;

/**
 * Archiving is reversible from monday's UI — the board moves out of the active
 * list rather than being erased. Archiving an already-archived board is a no-op,
 * so the call is safe to retry.
 */
const boardArchive: ActionDefinition<{ boardId: string }> = {
  key: "board-archive",
  type: "perform",
  resource: "board",
  title: "Archive Board",
  description: "Archive a board. Reversible from monday's UI.",
  idempotent: true,
  params: [{ key: "boardId", label: "Board ID", type: "string", required: true }],
  output: [
    { key: "archive_board.id", type: "string", label: "Board ID" },
    { key: "archive_board.state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, { id: input.boardId });
  },
};

export default boardArchive;
