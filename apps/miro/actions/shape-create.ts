import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, json, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, GEOMETRY_PARAMS, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/shapes` — verified against Miro's OpenAPI
 * document (`create-shape-item`).
 *
 * The **stable** shape endpoint. Miro also publishes
 * `/v2-experimental/boards/{id}/shapes` for flowchart shapes; experimental
 * paths are deliberately not used by this app, because Miro reserves the right
 * to change them without a version bump.
 */
const action: ActionDefinition = {
  key: "shape-create",
  type: "perform",
  resource: "shape",
  title: "Create a shape",
  description: "Add a shape to a board, optionally with text inside it.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    {
      key: "shape",
      label: "Shape",
      type: "select",
      default: "rectangle",
      options: [
        { value: "rectangle", label: "Rectangle" },
        { value: "round_rectangle", label: "Rounded rectangle" },
        { value: "circle", label: "Circle" },
        { value: "triangle", label: "Triangle" },
        { value: "rhombus", label: "Rhombus" },
        { value: "star", label: "Star" },
        { value: "arrow_right", label: "Arrow (right)" },
        { value: "cloud", label: "Cloud" },
        { value: "cross", label: "Cross" },
        { value: "predefined_process", label: "Predefined process" },
      ],
    },
    { key: "content", label: "Text", type: "text", default: "", hint: "Text inside the shape." },
    ...POSITION_PARAMS,
    ...GEOMETRY_PARAMS,
    PARENT_PARAM,
    {
      key: "style",
      label: "Style",
      type: "json",
      default: "",
      placeholder: '{"fillColor":"#f5f6f8","borderColor":"#1a1a1a"}',
      hint: "borderColor, borderStyle, borderWidth, color, fillColor, fillOpacity, fontFamily.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Shape data" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");

    const body = compact({
      data: compact({ shape: p.shape || "rectangle", content: p.content }),
      style: json(p.style, "style"),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });

    ctx.log("info", "creating Miro shape", { boardId, shape: p.shape });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/shapes`,
      { method: "POST", body },
    );
  },
};

export default action;
