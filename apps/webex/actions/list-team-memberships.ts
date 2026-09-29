import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  max?: number;
}

const listTeamMemberships: ActionDefinition<Input> = {
  key: "list-team-memberships",
  type: "read",
  resource: "team-membership",
  title: "List Team Memberships",
  description: "List the members of a team.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team membership ID" },
    { key: "personId", type: "string", label: "Person ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/team/memberships", {
      query: { teamId: input.teamId, max: input.max },
    });
    return res.items ?? [];
  },
};

export default listTeamMemberships;
