import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  team_id: string;
  user_id: string;
}

/**
 * `DELETE /v2/public/team/{team_id}/user/{user_id}` — remove a user from a
 * team. Only removes the team membership; the user itself is untouched.
 */
const teamUserRemove: ActionDefinition<Input> = {
  key: "team-user-remove",
  type: "perform",
  resource: "team",
  title: "Remove User from Team",
  description: "Remove a user from a team. Does not delete the user account itself.",
  idempotent: true,
  params: [
    { key: "team_id", label: "Team ID", type: "string", required: true },
    { key: "user_id", label: "User ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(
      `/team/${encodeURIComponent(input.team_id)}/user/${encodeURIComponent(input.user_id)}`,
      { method: "DELETE" },
    );
  },
};

export default teamUserRemove;
