import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, csv } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /api/v2/users/{id}/roles` — take roles away from a user.
 *
 * Note the shape: Auth0 takes the role ids in a **request body on a DELETE**,
 * which a client that strips bodies from DELETEs will appear to succeed at
 * while changing nothing. This app sends it.
 *
 * Removing a role the user does not have is not an error, so this is safe to
 * re-run — and it is the call an offboarding workflow should make *before*
 * blocking, so that a later unblock does not silently restore access.
 */
const action: ActionDefinition = {
  key: "user-role-remove",
  type: "perform",
  resource: "user",
  title: "Remove roles from a user",
  description:
    "Revoke tenant-level roles by id, leaving their other roles alone. Worth doing before " +
    "blocking, so an unblock does not restore access.",
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "roleIds",
      label: "Role IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated `rol_…` ids.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Removed" },
    { key: "roleIds", type: "array", label: "Role IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    const roles = csv(p.roleIds);
    if (!roles) throw new Error("`roleIds` is required");

    ctx.log("info", "removing Auth0 roles", { userId, roles });
    // A DELETE that carries a body — Auth0's shape, not a mistake.
    await new Auth0Client(ctx).request(`/users/${encodeURIComponent(userId)}/roles`, {
      method: "DELETE",
      body: { roles },
    });
    return { ok: true, roleIds: roles };
  },
};

export default action;
