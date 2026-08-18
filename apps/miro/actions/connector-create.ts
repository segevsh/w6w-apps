import type { ActionDefinition } from "@w6w/types";
import { compact, json, MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/connectors` — verified against Miro's OpenAPI
 * document (`create-connector`), whose body **requires both `startItem` and
 * `endItem`**.
 *
 * A connector is the line between two items, which is what turns a set of
 * sticky notes into a diagram — so this is the action that makes the
 * board-building ones worth having.
 */
const action: ActionDefinition = {
  key: "connector-create",
  type: "perform",
  resource: "connector",
  title: "Create a connector",
  description: "Draw a line between two items on a board.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    { key: "startItemId", label: "From Item ID", type: "string", required: true, default: "" },
    { key: "endItemId", label: "To Item ID", type: "string", required: true, default: "" },
    {
      key: "shape",
      label: "Line Shape",
      type: "select",
      default: "",
      options: [
        { value: "straight", label: "Straight" },
        { value: "elbowed", label: "Elbowed" },
        { value: "curved", label: "Curved" },
      ],
    },
    {
      key: "caption",
      label: "Caption",
      type: "string",
      default: "",
      hint: "Text on the line. Sent as Miro's single-entry `captions` array.",
    },
    {
      key: "style",
      label: "Style",
      type: "json",
      default: "",
      hint: "strokeColor, strokeStyle, strokeWidth, startStrokeCap, endStrokeCap, fontSize.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Connector ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "startItem", type: "object", label: "From" },
    { key: "endItem", type: "object", label: "To" },
    { key: "shape", type: "string", label: "Line shape" },
    { key: "captions", type: "array", label: "Captions" },
    { key: "style", type: "object", label: "Style" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const startItemId = String(p.startItemId ?? "").trim();
    const endItemId = String(p.endItemId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!startItemId) throw new Error("`startItemId` is required");
    if (!endItemId) throw new Error("`endItemId` is required");

    const caption = String(p.caption ?? "").trim();
    const body = compact({
      startItem: { id: startItemId },
      endItem: { id: endItemId },
      shape: p.shape,
      captions: caption ? [{ content: caption }] : undefined,
      style: json(p.style, "style"),
    });

    ctx.log("info", "creating Miro connector", { boardId, startItemId, endItemId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/connectors`,
      { method: "POST", body },
    );
  },
};

export default action;
