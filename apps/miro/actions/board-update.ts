import type { ActionDefinition } from "@w6w/types";
import { compact, json, MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `PATCH /v2/boards/{board_id}` — verified against Miro's OpenAPI document
 * (`update-board`). Every field is optional; only what the caller set is sent.
 */
const action: ActionDefinition = {
  key: "board-update",
  type: "perform",
  resource: "board",
  title: "Update a board",
  description: "Change a board's name, description, team, project or policy.",
  idempotent: true,
  params: [
    BOARD_PARAM,
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "teamId", label: "Team ID", type: "string", default: "" },
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    { key: "policy", label: "Policy", type: "json", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "policy", type: "object", label: "Policy" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");

    const body = compact({
      name: p.name,
      description: p.description,
      teamId: p.teamId,
      projectId: p.projectId,
      policy: json(p.policy, "policy"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating Miro board", { boardId, fields: Object.keys(body) });

    return await new MiroClient(ctx).request(`/v2/boards/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
