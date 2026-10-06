import type { ActionDefinition } from "@w6w/types";
import { seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";
import { teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
}

interface Output {
  team: Record<string, unknown>;
}

/** `GET /api/v2/teams/{TEAM_ID}` — scope `ZohoCliq.Teams.READ`. */
const teamGet: ActionDefinition<Input, Output> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Get one team's details.",
  params: [teamId],
  output: [{ key: "team", type: "object", label: "Team" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(`/teams/${seg(input.teamId)}`);
    return { team: unwrapData(body) };
  },
};

export default teamGet;
