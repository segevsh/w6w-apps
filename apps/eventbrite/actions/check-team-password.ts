import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  teamId: string;
  password: string;
}

const checkTeamPassword: ActionDefinition<Input> = {
  key: "check-team-password",
  type: "perform",
  resource: "team",
  title: "Check Team Password",
  description:
    "Verify a team's password; if correct, returns the team token. Makes no change on Eventbrite.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "password", label: "Password", type: "secret", required: true },
  ],
  output: [{ key: "token", type: "string", label: "Team token" }],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/teams/${
        encodeURIComponent(input.teamId)
      }/check_password/`,
      { method: "POST", body: { password: input.password } },
    );
  },
};

export default checkTeamPassword;
