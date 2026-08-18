import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, json, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/sticky_notes` — verified against Miro's OpenAPI
 * document (`create-sticky-note-item`), whose body nests `data.content`,
 * `data.shape`, `style`, `position`, `geometry` and `parent`.
 *
 * The one dimension rule worth knowing: Miro accepts **either** a width or a
 * height on a sticky note, never both — the other is derived from the content.
 * Sending both is a 400, so this action's geometry takes one field.
 */
const action: ActionDefinition = {
  key: "sticky-note-create",
  type: "perform",
  resource: "stickyNote",
  title: "Create a sticky note",
  description: "Add a sticky note to a board.",
  // Each call adds another note.
  idempotent: false,
  params: [
    BOARD_PARAM,
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      default: "",
      hint: "Plain text, or Miro's supported inline HTML.",
    },
    {
      key: "shape",
      label: "Shape",
      type: "select",
      default: "",
      options: [
        { value: "square", label: "Square" },
        { value: "rectangle", label: "Rectangle" },
      ],
    },
    {
      key: "fillColor",
      label: "Colour",
      type: "select",
      default: "",
      options: [
        { value: "gray", label: "Gray" },
        { value: "light_yellow", label: "Light yellow" },
        { value: "yellow", label: "Yellow" },
        { value: "orange", label: "Orange" },
        { value: "light_green", label: "Light green" },
        { value: "green", label: "Green" },
        { value: "dark_green", label: "Dark green" },
        { value: "cyan", label: "Cyan" },
        { value: "light_pink", label: "Light pink" },
        { value: "pink", label: "Pink" },
        { value: "violet", label: "Violet" },
        { value: "red", label: "Red" },
        { value: "light_blue", label: "Light blue" },
        { value: "blue", label: "Blue" },
        { value: "dark_blue", label: "Dark blue" },
        { value: "black", label: "Black" },
      ],
    },
    ...POSITION_PARAMS,
    {
      key: "width",
      label: "Width",
      type: "number",
      default: null,
      hint: "Miro takes a width OR a height on a sticky note, never both.",
    },
    {
      key: "height",
      label: "Height",
      type: "number",
      default: null,
      hint: "Leave blank if you set a width.",
    },
    PARENT_PARAM,
    {
      key: "style",
      label: "Extra Style",
      type: "json",
      default: "",
      hint: "Merged over the colour above — textAlign, textAlignVertical.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Content" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "geometry", type: "object", label: "Geometry" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const content = String(p.content ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!content) throw new Error("`content` is required");
    if (typeof p.width === "number" && typeof p.height === "number") {
      // Miro rejects both; naming the rule here beats a bare 400.
      throw new Error("set `width` or `height`, not both — Miro derives the other");
    }

    const extraStyle = (json(p.style, "style") ?? {}) as Record<string, unknown>;
    const body = compact({
      data: compact({ content, shape: p.shape }),
      style: compact({ fillColor: p.fillColor, ...extraStyle }),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });

    ctx.log("info", "creating Miro sticky note", { boardId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/sticky_notes`,
      { method: "POST", body },
    );
  },
};

export default action;
