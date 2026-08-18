import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, json, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/texts` — verified against Miro's OpenAPI document
 * (`create-text-item`), which is one of the few item endpoints with a genuinely
 * required body: `data` is required and `data.content` inside it.
 *
 * Geometry takes a **width only** — the schema's geometry for a text item has
 * `width` and `rotation` but no `height`, because the height follows the text.
 */
const action: ActionDefinition = {
  key: "text-create",
  type: "perform",
  resource: "text",
  title: "Create a text item",
  description: "Add a free text item to a board.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    { key: "content", label: "Content", type: "text", required: true, default: "" },
    ...POSITION_PARAMS,
    {
      key: "width",
      label: "Width",
      type: "number",
      default: null,
      hint: "Text items take a width only — the height follows the content.",
    },
    { key: "rotation", label: "Rotation", type: "number", default: null },
    PARENT_PARAM,
    {
      key: "style",
      label: "Style",
      type: "json",
      default: "",
      placeholder: '{"color":"#1a1a1a","fontSize":"14","textAlign":"left"}',
      hint: "color, fillColor, fillOpacity, fontFamily, fontSize, textAlign.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Content" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const content = String(p.content ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!content) throw new Error("`content` is required");

    const body = compact({
      data: { content },
      style: json(p.style, "style"),
      position: position(p.x, p.y),
      geometry: geometry(p.width, undefined, p.rotation),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });

    ctx.log("info", "creating Miro text item", { boardId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/texts`,
      { method: "POST", body },
    );
  },
};

export default action;
