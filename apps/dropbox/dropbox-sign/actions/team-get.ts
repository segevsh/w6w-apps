import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /team/info` — verified against the official OpenAPI document
 * (`teamInfo`).
 *
 * `/team/info` rather than `/team`: both exist, but `/team` returns the team
 * *with its full member list inline*, which is unbounded on a large team and
 * duplicates `team-members-list`. `/team/info` returns the team itself.
 */
const action: ActionDefinition = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get the team",
  description: "Retrieve the team this account belongs to.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      default: "",
      hint: "Blank means this connection's own team.",
    },
  ],
  output: [
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
    { key: "num_members", type: "number", label: "Members" },
    { key: "num_sub_teams", type: "number", label: "Sub-teams" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    ctx.log("info", "getting the Dropbox Sign team", {});

    const res = await new DropboxSignClient(ctx).request<
      { team?: Record<string, unknown> }
    >("/team/info", { query: compact({ team_id: p.teamId }) as Record<string, string> });
    return res?.team;
  },
};

export default action;
