import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/organizations` — the tenant's organizations.
 *
 * Organizations are Auth0's B2B primitive: one tenant, many customer companies,
 * each with its own members, its own branding and its own enabled connections.
 * A user belongs to the tenant *and* to zero or more organizations, and a login
 * happens in the context of one.
 *
 * That two-level model is why role questions have two answers here — a role at
 * the tenant means something everywhere, a role in an organization means
 * something for that customer only — and why `organization-member-list` exists
 * beside `user-role-list`.
 *
 * `enabled_connections` is the field that decides how a given customer's people
 * sign in: one organization on SAML, another on username-and-password, in the
 * same tenant.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "The tenant's organizations — Auth0's B2B unit, each with its own members, branding and " +
    "enabled sign-in connections.",
  params: [...LIST_PARAMS],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const { items, total } = await new Auth0Client(ctx).requestAll(
      "/organizations",
      "organizations",
      {},
      returnAll ? Infinity : limit,
    );
    return { organizations: items, total };
  },
};

export default action;
