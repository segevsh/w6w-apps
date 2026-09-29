import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  teamId: string;
}

const getTeam: ActionDefinition<Input> = {
  key: "get-team",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Get the details of a single team.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/teams/${encodeURIComponent(input.teamId)}`);
  },
};

export default getTeam;
