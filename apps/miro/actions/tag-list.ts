import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/tags` — verified against Miro's OpenAPI document
 * (`get-tags-from-board`). Offset-paginated.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List a board's tags",
  description: "List the tags defined on a board.",
  params: [BOARD_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro tags", { boardId, returnAll, limit });

    return await new MiroClient(ctx).requestAllOffset(
      `/v2/boards/${encodeURIComponent(boardId)}/tags`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
