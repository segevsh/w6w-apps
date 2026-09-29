import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  teamId: string;
}

const deleteTeam: ActionDefinition<Input> = {
  key: "delete-team",
  type: "perform",
  resource: "team",
  title: "Delete Team",
  description: "Delete a team and all the spaces (rooms) associated with it. Irreversible.",
  idempotent: true,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new WebexClient(ctx).request(`/teams/${encodeURIComponent(input.teamId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default deleteTeam;
