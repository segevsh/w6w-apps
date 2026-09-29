import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  personId?: string;
  personEmail?: string;
  isModerator?: boolean;
}

const createTeamMembership: ActionDefinition<Input> = {
  key: "create-team-membership",
  type: "perform",
  resource: "team-membership",
  title: "Add Person to Team",
  description: "Add a person to a team, by ID or email — set exactly one.",
  // Webex mints a new team membership id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "personId", label: "Person ID", type: "string" },
    { key: "personEmail", label: "Person email", type: "string" },
    { key: "isModerator", label: "Moderator", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Team membership ID" },
    { key: "personId", type: "string", label: "Person ID" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request("/team/memberships", {
      method: "POST",
      body: {
        teamId: input.teamId,
        personId: unset(input.personId),
        personEmail: unset(input.personEmail),
        isModerator: input.isModerator,
      },
    });
  },
};

export default createTeamMembership;
