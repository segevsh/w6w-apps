import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v2/boards/{board_id}/items/{item_id}` — verified against Miro's
 * OpenAPI document (`delete-item`). Works for any item type. Miro answers 204,
 * so this reports what went.
 */
const action: ActionDefinition = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete an item",
  description: "Remove one item of any type from a board.",
  idempotent: true,
  params: [
    BOARD_PARAM,
    { key: "itemId", label: "Item ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    ctx.log("info", "deleting Miro item", { boardId, itemId });

    await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    );
    return { id: itemId, deleted: true };
  },
};

export default action;
