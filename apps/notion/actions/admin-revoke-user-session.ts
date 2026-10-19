import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  user: Record<string, unknown>;
}

/** POST /admin/v1/managed_users/revoke_session — revoke-user-session. */
const action: ActionDefinition<Input> = {
  key: "admin-revoke-user-session",
  type: "perform",
  resource: "admin",
  title: "Admin: Revoke a managed user's sessions",
  description:
    "Admin: Revoke a managed user's sessions. Requires an Enterprise organization bot token.",
  output: [{ "key": "status", "type": "string", "label": "Status" }],
  idempotent: false,
  params: [{
    "key": "user",
    "label": "User",
    "type": "json",
    "required": true,
    "hint": "The managed user whose active sessions should be revoked.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/managed_users/revoke_session`, {
      method: "POST",
      admin: true,
      body: {
        "user": input.user,
      },
    });
  },
};

export default action;
