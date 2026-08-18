import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, GEOMETRY_PARAMS, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/images` — verified against Miro's OpenAPI
 * document (`create-image-item-using-url`; `data` is required and `data.url`
 * inside it).
 *
 * **From a URL, not from a file.** Miro's other image endpoint takes a
 * multipart upload from the device, which is not a shape an action's JSON body
 * can express — so this app exposes the URL arm and says so rather than
 * half-implementing the other.
 */
const action: ActionDefinition = {
  key: "image-create",
  type: "perform",
  resource: "image",
  title: "Add an image from a URL",
  description: "Place an image on a board by URL.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    {
      key: "url",
      label: "Image URL",
      type: "string",
      required: true,
      default: "",
      hint: "Must be publicly reachable — Miro fetches it server-side.",
    },
    { key: "title", label: "Title", type: "string", default: "" },
    ...POSITION_PARAMS,
    ...GEOMETRY_PARAMS,
    PARENT_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Image data" },
    { key: "position", type: "object", label: "Position" },
    { key: "geometry", type: "object", label: "Geometry" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const url = String(p.url ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!url) throw new Error("`url` is required");

    const body = compact({
      data: compact({ url, title: p.title }),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });

    ctx.log("info", "creating Miro image", { boardId });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/images`,
      { method: "POST", body },
    );
  },
};

export default action;
