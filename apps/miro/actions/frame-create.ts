import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, GEOMETRY_PARAMS, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/frames` — verified against Miro's OpenAPI
 * document (`create-frame-item`), whose `data` carries `title`, `format`,
 * `type` and `showContent`.
 *
 * A frame is the container other items are parented into, so this is usually
 * the first thing a board-building workflow creates — its id becomes the
 * `parentId` of everything that follows. Frames take no `parent` of their own.
 */
const action: ActionDefinition = {
  key: "frame-create",
  type: "perform",
  resource: "frame",
  title: "Create a frame",
  description: "Add a frame to a board, to hold other items.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    { key: "title", label: "Title", type: "string", default: "" },
    ...POSITION_PARAMS,
    ...GEOMETRY_PARAMS,
    {
      key: "fillColor",
      label: "Fill Colour",
      type: "string",
      default: "",
      placeholder: "#ffffffff",
    },
    {
      key: "showContent",
      label: "Show Content",
      type: "boolean",
      default: null,
      hint: "Whether the frame's contents are visible when collapsed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Frame ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Frame data" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "geometry", type: "object", label: "Geometry" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");

    const body = compact({
      data: compact({
        title: p.title,
        showContent: typeof p.showContent === "boolean" ? p.showContent : undefined,
      }),
      style: compact({ fillColor: p.fillColor }),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
    });

    ctx.log("info", "creating Miro frame", { boardId, title: p.title });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/frames`,
      { method: "POST", body },
    );
  },
};

export default action;
