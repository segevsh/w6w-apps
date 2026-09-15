import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /users/{user_id}/ban` — revokes all of the user's sessions and blocks future sign-in.
 * Reversible via `user-unban`, unlike `user-delete`.
 */
const action: ActionDefinition = {
  key: "user-ban",
  type: "perform",
  resource: "user",
  title: "Ban user",
  description: "Ban a user: revokes their active sessions and blocks further sign-in. Reversible.",
  idempotent: true,
  params: [USER_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "banned", type: "boolean", label: "Banned" },
  ],

  async execute(input, ctx) {
    const userId = String((input as Record<string, unknown>).userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    ctx.log("info", "banning a Clerk user", { userId });
    return await new ClerkClient(ctx).request(`/users/${encodeURIComponent(userId)}/ban`, {
      method: "POST",
    });
  },
};
export default action;
