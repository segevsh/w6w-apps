import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/items?parent_item_id=…` — verified against Miro's
 * OpenAPI document (`get-items-within-frame`), which lists it under the renamed
 * path parameter `{board_id_PlatformContainers}`. That rename is a generator
 * artifact; the URL is the ordinary items path, and `parent_item_id` is what
 * scopes it to a frame.
 */
const action: ActionDefinition = {
  key: "item-list-in-frame",
  type: "read",
  resource: "item",
  title: "List items in a frame",
  description: "List the items inside one frame.",
  params: [
    BOARD_PARAM,
    {
      key: "frameId",
      label: "Frame ID",
      type: "string",
      required: true,
      default: "",
      hint: "Sent as Miro's `parent_item_id`.",
    },
    ...LIST_PARAMS,
    { key: "type", label: "Type", type: "string", default: "", hint: "Filter by item type." },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const frameId = String(p.frameId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!frameId) throw new Error("`frameId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro items in frame", { boardId, frameId });

    return await new MiroClient(ctx).requestAllCursor(
      `/v2/boards/${encodeURIComponent(boardId)}/items`,
      { query: { parent_item_id: frameId, type: (p.type as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
