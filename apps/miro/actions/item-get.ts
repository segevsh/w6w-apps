import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/items/{item_id}` — verified against Miro's
 * OpenAPI document (`get-specific-item`). Works for every item type; the
 * response's `type` says which one, and `data` is shaped accordingly.
 */
const action: ActionDefinition = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get an item",
  description: "Retrieve one item of any type from a board.",
  params: [
    BOARD_PARAM,
    { key: "itemId", label: "Item ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Type-specific data" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "geometry", type: "object", label: "Geometry" },
    { key: "parent", type: "object", label: "Parent frame" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "modifiedAt", type: "string", label: "Modified at" },
    { key: "links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    ctx.log("info", "getting Miro item", { boardId, itemId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`,
    );
  },
};

export default action;
