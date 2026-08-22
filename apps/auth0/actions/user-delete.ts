import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /api/v2/users/{id}` — remove a user permanently.
 *
 * There is no undo and no recycle bin: the profile, its metadata, its role
 * assignments and its identity links all go. Two consequences are worth knowing
 * before choosing this over `user-update`'s **blocked** flag:
 *
 *   - **The email becomes available again.** A fresh signup with the same
 *     address creates a *new* user with a *new* id, so anything that stored the
 *     old id now points at nothing while the person appears to still be there.
 *   - **Existing sessions and tokens are not revoked by this call.** An
 *     already-issued access token keeps working until it expires, so a delete
 *     alone does not end access — which is exactly what an offboarding workflow
 *     usually thinks it is doing.
 *
 * Blocking does neither of those things and can be reversed, which is why it is
 * the better default and why this action points at it.
 */
const action: ActionDefinition = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete user",
  description:
    "Permanently delete a user. Blocking is usually what an offboarding workflow wants: this " +
    "frees the email for a new signup and does not revoke live tokens.",
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "confirm",
      label: "Yes, delete this user permanently",
      type: "boolean",
      required: true,
      default: false,
      hint: "No undo. Their roles, metadata and identity links go too, and any stored reference " +
        "to their id stops resolving.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "userId", type: "string", label: "User ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete ${userId} without \`confirm\` — consider blocking instead, which is ` +
          "reversible, keeps the audit trail, and does not free the email address",
      );
    }

    ctx.log("warn", "deleting an Auth0 user", { userId });
    await new Auth0Client(ctx).request(`/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    return { ok: true, userId };
  },
};

export default action;
