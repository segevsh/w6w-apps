import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/items` — verified against Miro's OpenAPI document
 * (`get-items`). **Cursor**-paginated (`{ data, total, size, cursor, limit }`),
 * unlike `GET /v2/boards`, which is offset-paginated.
 *
 * This one endpoint answers three questions depending on its query parameters,
 * which is why Miro's spec lists it three times under renamed path parameters
 * (`{board_id}`, `{board_id_PlatformTags}`, `{board_id_PlatformContainers}`):
 * bare it lists everything, with `parent_item_id` it lists a frame's contents,
 * and with `tag_id` it lists what carries a tag. All three are the same URL —
 * see `lib/client.ts`. `item-list-by-tag` and `item-list-in-frame` are the
 * other two, kept separate because their required parameters differ.
 */
const action: ActionDefinition = {
  key: "item-list",
  type: "read",
  resource: "item",
  title: "List a board's items",
  description: "List the items on a board, optionally filtered by type.",
  params: [
    BOARD_PARAM,
    ...LIST_PARAMS,
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "app_card", label: "App card" },
        { value: "card", label: "Card" },
        { value: "document", label: "Document" },
        { value: "embed", label: "Embed" },
        { value: "frame", label: "Frame" },
        { value: "image", label: "Image" },
        { value: "shape", label: "Shape" },
        { value: "sticky_note", label: "Sticky note" },
        { value: "text", label: "Text" },
      ],
      hint: "Leave blank for every type.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro board items", { boardId, returnAll, limit });

    return await new MiroClient(ctx).requestAllCursor(
      `/v2/boards/${encodeURIComponent(boardId)}/items`,
      { query: { type: (p.type as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
