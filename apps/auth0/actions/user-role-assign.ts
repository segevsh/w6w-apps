import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, csv } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /api/v2/users/{id}/roles` — grant roles to a user.
 *
 * Additive and idempotent: assigning a role the user already has is not an
 * error, and other roles are untouched. That makes it safe to re-run, which is
 * what a provisioning workflow needs.
 *
 * Roles are named by **id** (`rol_…`), not by name — `role-list` maps between
 * them. Sending a name silently matches nothing, since Auth0 treats it as an
 * unknown id.
 *
 * A role granted here is tenant-wide. Granting one *inside an organization* is
 * a different call on a different resource, because the two mean different
 * things: one says what this person is everywhere, the other what they are in
 * one customer's context.
 */
const action: ActionDefinition = {
  key: "user-role-assign",
  type: "perform",
  resource: "user",
  title: "Assign roles to a user",
  description:
    "Grant tenant-level roles by id. Additive and safe to re-run — existing roles are left " +
    "alone.",
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "roleIds",
      label: "Role IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "rol_abc123,rol_def456",
      hint: "Comma-separated `rol_…` ids, not names. `role-list` maps names to ids.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Assigned" },
    { key: "roleIds", type: "array", label: "Role IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    const roles = csv(p.roleIds);
    if (!roles) throw new Error("`roleIds` is required");
    if (!roles.every((r) => r.startsWith("rol_"))) {
      throw new Error(
        "Auth0 role ids start with `rol_` — this looks like a role NAME, which matches nothing " +
          `(got ${roles.filter((r) => !r.startsWith("rol_")).join(", ")})`,
      );
    }

    ctx.log("info", "assigning Auth0 roles", { userId, roles });
    await new Auth0Client(ctx).request(`/users/${encodeURIComponent(userId)}/roles`, {
      method: "POST",
      body: { roles },
    });
    return { ok: true, roleIds: roles };
  },
};

export default action;
