import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  team_id: string;
  user_id: string;
  is_admin?: boolean;
}

/**
 * `POST /v2/public/team/{team_id}/user` — add an existing user to a team.
 * Unlike the office equivalent, `is_admin` is optional here per the vendor's
 * schema (only `user_id` is required).
 */
const teamUserAdd: ActionDefinition<Input> = {
  key: "team-user-add",
  type: "perform",
  resource: "team",
  title: "Add User to Team",
  description: "Add an existing user to a team, optionally as a team admin.",
  idempotent: true,
  params: [
    { key: "team_id", label: "Team ID", type: "string", required: true },
    { key: "user_id", label: "User ID", type: "string", required: true },
    { key: "is_admin", label: "Team admin", type: "boolean", default: false },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const { team_id, user_id, is_admin } = input;
    return await new KvCoreClient(ctx).json(`/team/${encodeURIComponent(team_id)}/user`, {
      method: "POST",
      body: is_admin === undefined ? { user_id } : { user_id, is_admin: is_admin ? 1 : 0 },
    });
  },
};

export default teamUserAdd;
