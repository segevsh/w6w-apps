import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/items?tag_id=…` — verified against Miro's OpenAPI
 * document (`get-items-by-tag`), listed there under the renamed path parameter
 * `{board_id_PlatformTags}`.
 *
 * Note the pagination difference, which the spec is explicit about: this
 * variant takes `limit` and **`offset`**, not the `cursor` the bare items list
 * uses. So it goes through the offset pager.
 */
const action: ActionDefinition = {
  key: "item-list-by-tag",
  type: "read",
  resource: "item",
  title: "List items with a tag",
  description: "List the items on a board that carry one tag.",
  params: [
    BOARD_PARAM,
    { key: "tagId", label: "Tag ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const tagId = String(p.tagId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!tagId) throw new Error("`tagId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro items by tag", { boardId, tagId });

    // Offset, not cursor — this variant of the endpoint takes `offset`.
    return await new MiroClient(ctx).requestAllOffset(
      `/v2/boards/${encodeURIComponent(boardId)}/items`,
      { query: { tag_id: tagId } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
