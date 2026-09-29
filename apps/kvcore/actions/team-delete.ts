import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  team_id: string;
}

/** `DELETE /v2/public/team/{team_id}` — remove a team from the account. */
const teamDelete: ActionDefinition<Input> = {
  key: "team-delete",
  type: "perform",
  resource: "team",
  title: "Remove Team",
  description: "Remove a team from the account.",
  idempotent: true,
  params: [{ key: "team_id", label: "Team ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/team/${encodeURIComponent(input.team_id)}`, {
      method: "DELETE",
    });
  },
};

export default teamDelete;
