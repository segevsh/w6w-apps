import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  team_id: string;
}

/** `GET /v2/public/team/{team_id}` — a single team's full record. */
const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Fetch a single team by ID.",
  params: [{ key: "team_id", label: "Team ID", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/team/${encodeURIComponent(input.team_id)}`);
  },
};

export default teamGet;
