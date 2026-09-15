import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /users/{user_id}` — permanent, and frees the identifier.
 *
 * Once deleted, the user's email/phone can be claimed by a brand-new signup — so anything still
 * holding the old user ID (a workflow variable, a downstream record) silently points at nothing,
 * or worse, at a different person later. `user-ban` is the reversible alternative that keeps the
 * audit trail; this action requires an explicit confirmation because of that asymmetry.
 */
const action: ActionDefinition = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete user",
  description: "Permanently delete a user. Frees their email/phone for a future signup. Prefer " +
    '"Ban user" when the intent is to revoke access rather than erase the account.',
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "confirm",
      label: "I understand this is permanent",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to true — deleting a user is permanent and frees their " +
          "email/phone for reuse",
      );
    }

    ctx.log("warn", "permanently deleting a Clerk user", { userId });
    return await new ClerkClient(ctx).request(`/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },
};
export default action;
