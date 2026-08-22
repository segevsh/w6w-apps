import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /team/members/{team_id}` — verified against the official OpenAPI
 * document (`teamMembers`).
 *
 * Members are how the `accountId` parameter on the list actions gets its value:
 * this is where a team member's account id comes from.
 */
const action: ActionDefinition = {
  key: "team-members-list",
  type: "read",
  resource: "team",
  title: "List team members",
  description: "List the members of a team, with their account ids and roles.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const teamId = String(p.teamId ?? "").trim();
    if (!teamId) throw new Error("`teamId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Dropbox Sign team members", { teamId, returnAll, limit });

    return await new DropboxSignClient(ctx).requestAll(
      `/team/members/${encodeURIComponent(teamId)}`,
      "team_members",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
