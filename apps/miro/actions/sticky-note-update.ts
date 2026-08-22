import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, json, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `PATCH /v2/boards/{board_id}/sticky_notes/{item_id}` — verified against
 * Miro's OpenAPI document (`update-sticky-note-item`). Unlike the generic
 * `item-move`, this one can change the note's content and colour.
 */
const action: ActionDefinition = {
  key: "sticky-note-update",
  type: "perform",
  resource: "stickyNote",
  title: "Update a sticky note",
  description: "Change a sticky note's text, colour, position or size.",
  idempotent: true,
  params: [
    BOARD_PARAM,
    { key: "itemId", label: "Item ID", type: "string", required: true, default: "" },
    { key: "content", label: "Content", type: "text", default: "" },
    { key: "shape", label: "Shape", type: "string", default: "" },
    { key: "fillColor", label: "Colour", type: "string", default: "" },
    ...POSITION_PARAMS,
    { key: "width", label: "Width", type: "number", default: null },
    { key: "height", label: "Height", type: "number", default: null },
    { key: "style", label: "Extra Style", type: "json", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "data", type: "object", label: "Content" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "modifiedAt", type: "string", label: "Modified at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!itemId) throw new Error("`itemId` is required");
    if (typeof p.width === "number" && typeof p.height === "number") {
      throw new Error("set `width` or `height`, not both — Miro derives the other");
    }

    const extraStyle = (json(p.style, "style") ?? {}) as Record<string, unknown>;
    const body = compact({
      data: compact({ content: p.content, shape: p.shape }),
      style: compact({ fillColor: p.fillColor, ...extraStyle }),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating Miro sticky note", { boardId, itemId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/sticky_notes/${encodeURIComponent(itemId)}`,
      { method: "PATCH", body },
    );
  },
};

export default action;
