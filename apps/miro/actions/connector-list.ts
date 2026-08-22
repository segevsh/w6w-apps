import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}/connectors` — verified against Miro's OpenAPI
 * document (`get-connectors`). Cursor-paginated, like the items collection.
 */
const action: ActionDefinition = {
  key: "connector-list",
  type: "read",
  resource: "connector",
  title: "List connectors",
  description: "List the connectors on a board — the lines between items.",
  params: [BOARD_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro connectors", { boardId, returnAll, limit });

    return await new MiroClient(ctx).requestAllCursor(
      `/v2/boards/${encodeURIComponent(boardId)}/connectors`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
