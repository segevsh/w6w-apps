import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS, ORGANIZATION_ID_PARAM } from "../lib/params.ts";

const action: ActionDefinition = {
  key: "organization-membership-list",
  type: "read",
  resource: "organization-membership",
  title: "List organization members",
  description: "List the members of an organization.",
  params: [ORGANIZATION_ID_PARAM, ...LIST_PARAMS],
  output: [
    { key: "data", type: "array", label: "Memberships" },
    { key: "totalCount", type: "number", label: "Total members" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");

    const { data, total_count } = await new ClerkClient(ctx).requestEnvelope(
      `/organizations/${encodeURIComponent(organizationId)}/memberships`,
      {
        query: {
          limit: (p.limit as number | undefined) ?? 10,
          offset: (p.offset as number | undefined) ?? 0,
        },
      },
    );
    return { data, totalCount: total_count };
  },
};
export default action;
