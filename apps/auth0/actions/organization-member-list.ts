import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/organizations/{id}/members` — who belongs to one customer.
 *
 * The other half of "who has access to what". `user-role-list` answers what a
 * person is across the whole tenant; this answers who is inside one
 * organization — and the two are independent. Somebody can be an admin of one
 * customer's organization and nothing at all at the tenant level, which is
 * exactly what a B2B model should allow and exactly what a naive audit misses.
 *
 * `fields=roles` asks Auth0 to include each member's roles *within this
 * organization*, which turns two calls per member into one call for everybody.
 */
const action: ActionDefinition = {
  key: "organization-member-list",
  type: "read",
  resource: "organization",
  title: "List organization members",
  description:
    "Members of one organization, optionally with their roles inside it — which are separate " +
    "from any tenant-level roles they hold.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "org_abc123",
    },
    {
      key: "includeRoles",
      label: "Include Roles",
      type: "boolean",
      default: true,
      hint: "Each member's roles within this organization, in the same request.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const { items, total } = await new Auth0Client(ctx).requestAll(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      "members",
      { query: { fields: p.includeRoles === false ? undefined : "roles" } },
      returnAll ? Infinity : limit,
    );
    return { members: items, total };
  },
};

export default action;
