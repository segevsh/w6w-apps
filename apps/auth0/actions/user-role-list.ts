import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { LIST_PARAMS, USER_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v2/users/{id}/roles` — the roles assigned directly to a user.
 *
 * **Directly** is the load-bearing word. Auth0 has two places a user can get a
 * role: assigned to them on the tenant, which is what this returns, and
 * assigned to them *within an organization*, which is separate and does not
 * appear here. A workflow auditing "who is an admin" needs both, and
 * `organization-member-list` is the other half.
 *
 * Roles carry permissions; this returns the roles, not the permissions they
 * expand to.
 */
const action: ActionDefinition = {
  key: "user-role-list",
  type: "read",
  resource: "user",
  title: "List a user's roles",
  description: "Roles assigned directly to a user at the tenant level. Roles granted inside an " +
    "organization are separate and do not appear here.",
  params: [USER_ID_PARAM, ...LIST_PARAMS],
  output: [
    { key: "roles", type: "array", label: "Roles" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const { items, total } = await new Auth0Client(ctx).requestAll(
      `/users/${encodeURIComponent(userId)}/roles`,
      "roles",
      {},
      returnAll ? Infinity : limit,
    );
    return { roles: items, total };
  },
};

export default action;
