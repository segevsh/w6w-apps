import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
}

const deleteTeamMembership: ActionDefinition<Input> = {
  key: "delete-team-membership",
  type: "perform",
  resource: "team-membership",
  title: "Remove Person from Team",
  description: "Delete a team membership, removing the person from the team.",
  idempotent: true,
  params: [
    { key: "membershipId", label: "Team membership ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new WebexClient(ctx).request(
      `/team/memberships/${encodeURIComponent(input.membershipId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteTeamMembership;
