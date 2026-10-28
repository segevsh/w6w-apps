import type { ActionDefinition } from "@w6w/types";
import { entraError, GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { selectParam } from "../lib/params.ts";

interface Input {
  select?: string[];
}

/**
 * `GET /organization`
 *
 * https://learn.microsoft.com/en-us/graph/api/organization-list?view=graph-rest-1.0
 *
 * The signed-in user's tenant profile. Graph exposes it as a collection that always holds exactly
 * one organization (there is also `GET /organization/{id}`, which needs the tenant id up front), so
 * the action unwraps `value[0]`. Holding only `User.Read`, a caller sees just `id`, `displayName`
 * and `verifiedDomains` — every other property is `null`; this App requests `Organization.Read.All`
 * so the whole profile (technical contacts, `assignedPlans`, `tenantType`, …) is available. Use
 * `verifiedDomains` to pick a valid domain for a new user's UPN.
 */
const getOrganization: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-organization",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get the tenant's organization profile, including its verified domains.",
  params: [selectParam()],
  output: [
    { key: "id", type: "string", label: "Tenant id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "verifiedDomains", type: "array", label: "Verified domains" },
    { key: "tenantType", type: "string", label: "Tenant type" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const res = await client.request<Pick<PagedResult<Record<string, unknown>>, "value">>(
      "/organization",
      { query: { $select: odataList(input.select) } },
    );
    const org = res?.value?.[0];
    if (!org) throw new Error(entraError("Graph returned no organization."));
    return org;
  },
};

export default getOrganization;
