import type { ActionDefinition } from "@w6w/types";
import { compact, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `PATCH /v2/boards/{board_id}/items/{item_id}` — verified against Miro's
 * OpenAPI document (`update-item-position-or-parent`), whose body carries
 * exactly two fields: `position` and `parent`.
 *
 * That is the whole endpoint — it moves an item or reparents it into a frame,
 * and cannot edit content. The type-specific update endpoints do that, and this
 * app exposes them per type where it exposes them at all.
 */
const action: ActionDefinition = {
  key: "item-move",
  type: "perform",
  resource: "item",
  title: "Move an item",
  description: "Reposition an item, or move it into a different frame.",
  idempotent: true,
  params: [
    BOARD_PARAM,
    { key: "itemId", label: "Item ID", type: "string", required: true, default: "" },
    ...POSITION_PARAMS,
    PARENT_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "position", type: "object", label: "Position" },
    { key: "parent", type: "object", label: "Parent frame" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    const body = compact({
      position: position(p.x, p.y),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("set a position or a parent frame — there is nothing else to move");
    }

    ctx.log("info", "moving Miro item", { boardId, itemId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`,
      { method: "PATCH", body },
    );
  },
};

export default action;
