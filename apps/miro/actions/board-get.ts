import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `GET /v2/boards/{board_id}` — verified against Miro's OpenAPI document
 * (`get-specific-board`).
 */
const action: ActionDefinition = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get a board",
  description: "Retrieve one board's details and sharing policy.",
  params: [BOARD_PARAM],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "viewLink", type: "string", label: "View link" },
    { key: "team", type: "object", label: "Team" },
    { key: "project", type: "object", label: "Project" },
    { key: "owner", type: "object", label: "Owner" },
    { key: "policy", type: "object", label: "Sharing and permissions policy" },
    { key: "currentUserMembership", type: "object", label: "Current user's membership" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");

    ctx.log("info", "getting Miro board", { boardId });
    return await new MiroClient(ctx).request(`/v2/boards/${encodeURIComponent(boardId)}`);
  },
};

export default action;
