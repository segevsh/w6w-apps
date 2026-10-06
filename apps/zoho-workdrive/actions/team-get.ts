import type { ActionDefinition } from "@w6w/types";
import { WorkDriveClient } from "../lib/client.ts";
import { teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
}

/** `GET /teams/{team_id}`. */
const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Fetch a WorkDrive team's details (storage, capabilities, owner).",
  params: [teamId],
  output: [{ key: "item", type: "object", label: "Team resource (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(`/teams/${encodeURIComponent(input.teamId)}`);
    return { item: body.data ?? null };
  },
};

export default teamGet;
