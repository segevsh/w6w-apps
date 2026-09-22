import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import type { TeamMember } from "../lib/schema.ts";

/**
 * `GET /team/all/` — every team member on the account.
 *
 * The one read that needs no parameter and no per-record secret, which is why
 * it is also the connection's credential probe (`auth/api-token.ts`) and the
 * source for the connection label.
 *
 * The response is a bare JSON array — Workiz does not wrap it in the
 * `{flag, data}` envelope the write endpoints use.
 */
const teamList: ActionDefinition<Record<string, never>, { items: TeamMember[] }> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Team",
  description: "List every team member on the Workiz account, with their role, skills and areas.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Team members" },
  ],

  async execute(_input, ctx) {
    const items = await new WorkizClient(ctx).json<TeamMember[]>("/team/all/");
    return { items: items ?? [] };
  },
};

export default teamList;
