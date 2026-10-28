import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

/**
 * Trello's DELETE on a board is permanent — there is no trash to restore from.
 * To take a board out of circulation reversibly, use `board-update` with
 * `closed: true` instead.
 */
const boardDelete: ActionDefinition<{ id: string }> = {
  key: "board-delete",
  type: "perform",
  resource: "board",
  title: "Delete Board",
  description: "Permanently delete a board. Use `board-update` with Archived instead if unsure.",
  // Deleting an already-deleted board 404s, but the end state is identical.
  idempotent: true,
  params: [{ key: "id", label: "Board ID", type: "string", required: true }],
  output: [{ key: "_value", type: "string", label: "Trello's null result" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/boards/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default boardDelete;
