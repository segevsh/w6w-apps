import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/groups/` — the groups that carry permissions.
 *
 * In dbt Cloud a person's permissions come from their groups, not from
 * themselves, and each group carries `group_permissions` naming what it can do
 * and in which project. So "who can deploy to production" is a question about
 * this list, not the user list.
 *
 * `sso_mapping_groups` is the field worth surfacing: a group mapped to an
 * identity-provider group is filled from the IdP, and editing its membership in
 * dbt Cloud is pointless — the next sign-in overwrites it. A group with no
 * mapping is managed by hand and stays as it is. Telling the two apart is the
 * difference between an access change that sticks and one that quietly reverts.
 */
const action: ActionDefinition = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List groups",
  description:
    "The groups permissions actually hang off. A group mapped to an SSO group is filled from the " +
    "IdP, so editing it in dbt Cloud reverts at the next sign-in.",
  params: [...LIST_PARAMS],
  output: [
    { key: "groups", type: "array", label: "Groups" },
    { key: "count", type: "number", label: "Groups returned" },
    { key: "ssoManaged", type: "array", label: "Groups filled from the identity provider" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const { items } = await client.requestAll<
      { name?: string; sso_mapping_groups?: string[] }
    >(`/api/v3/accounts/${client.accountId}/groups/`, {}, want);

    const ssoManaged = items
      .filter((g) => Array.isArray(g?.sso_mapping_groups) && g.sso_mapping_groups.length > 0)
      .map((g) => String(g?.name ?? ""));

    return { groups: items, count: items.length, ssoManaged };
  },
};

export default action;
