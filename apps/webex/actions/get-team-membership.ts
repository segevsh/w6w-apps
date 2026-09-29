import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
}

const getTeamMembership: ActionDefinition<Input> = {
  key: "get-team-membership",
  type: "read",
  resource: "team-membership",
  title: "Get Team Membership",
  description: "Get the details of a single team membership.",
  params: [
    { key: "membershipId", label: "Team membership ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Team membership ID" },
    { key: "teamId", type: "string", label: "Team ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(
      `/team/memberships/${encodeURIComponent(input.membershipId)}`,
    );
  },
};

export default getTeamMembership;
