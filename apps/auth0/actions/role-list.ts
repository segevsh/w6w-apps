import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/roles` — the tenant's roles, mapping names to the `rol_…` ids
 * every assignment call needs.
 *
 * Roles are containers for **permissions**, and permissions belong to an API
 * (a "resource server") rather than to the tenant. So a role is only meaningful
 * against the API whose permissions it holds — which is why granting somebody a
 * role does nothing visible until an application requests an access token for
 * that API.
 *
 * The `name_filter` matches on name, which is how a workflow can look a role up
 * without hard-coding an id that differs between tenants.
 */
const action: ActionDefinition = {
  key: "role-list",
  type: "read",
  resource: "role",
  title: "List roles",
  description:
    "The tenant's roles and their `rol_…` ids — the lookup every role assignment needs, since " +
    "ids differ between tenants and names do not.",
  params: [
    {
      key: "nameFilter",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Look a role up by name rather than hard-coding an id.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "roles", type: "array", label: "Roles" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const { items, total } = await new Auth0Client(ctx).requestAll("/roles", "roles", {
      query: { name_filter: String(p.nameFilter ?? "") || undefined },
    }, returnAll ? Infinity : limit);
    return { roles: items, total };
  },
};

export default action;
