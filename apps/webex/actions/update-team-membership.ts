import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
  isModerator: boolean;
}

const updateTeamMembership: ActionDefinition<Input> = {
  key: "update-team-membership",
  type: "perform",
  resource: "team-membership",
  title: "Update Team Membership",
  description: "Change a team member's moderator flag.",
  idempotent: true,
  params: [
    { key: "membershipId", label: "Team membership ID", type: "string", required: true },
    { key: "isModerator", label: "Moderator", type: "boolean", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Team membership ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(
      `/team/memberships/${encodeURIComponent(input.membershipId)}`,
      { method: "PUT", body: { isModerator: input.isModerator } },
    );
  },
};

export default updateTeamMembership;
