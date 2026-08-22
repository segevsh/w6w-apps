import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/members` — verified against Miro's OpenAPI
 * document (`get-board-members`). Offset-paginated.
 */
const action: ActionDefinition = {
  key: "board-member-list",
  type: "read",
  resource: "member",
  title: "List board members",
  description: "List who has access to a board, and with what role.",
  params: [BOARD_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro board members", { boardId, returnAll, limit });

    return await new MiroClient(ctx).requestAllOffset(
      `/v2/boards/${encodeURIComponent(boardId)}/members`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
