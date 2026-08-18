import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v2/boards/{board_id}` — verified against Miro's OpenAPI document
 * (`delete-board`). Miro answers 204 with no body, so this reports what went.
 */
const action: ActionDefinition = {
  key: "board-delete",
  type: "perform",
  resource: "board",
  title: "Delete a board",
  description: "Move a board to the trash.",
  idempotent: true,
  params: [BOARD_PARAM],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");

    ctx.log("info", "deleting Miro board", { boardId });

    await new MiroClient(ctx).request(`/v2/boards/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
    });
    return { id: boardId, deleted: true };
  },
};

export default action;
