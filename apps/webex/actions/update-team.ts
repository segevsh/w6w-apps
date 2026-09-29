import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  name: string;
  description?: string;
}

const updateTeam: ActionDefinition<Input> = {
  key: "update-team",
  type: "perform",
  resource: "team",
  title: "Update Team",
  description: "Rename a team or change its description. A full replace — Webex requires `name` " +
    "even when only the description changes.",
  idempotent: true,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/teams/${encodeURIComponent(input.teamId)}`, {
      method: "PUT",
      body: { name: input.name, description: unset(input.description) },
    });
  },
};

export default updateTeam;
