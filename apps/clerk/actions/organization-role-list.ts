import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /organization_roles` — instance-wide, not per-organization: every organization on an
 * instance shares the same role set (`org:admin`, `org:member` by default, plus any custom roles).
 */
const action: ActionDefinition = {
  key: "organization-role-list",
  type: "read",
  resource: "organization-role",
  title: "List organization roles",
  description: "List the organization roles configured for this instance.",
  params: [...LIST_PARAMS],
  output: [
    { key: "data", type: "array", label: "Roles" },
    { key: "totalCount", type: "number", label: "Total roles" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { data, total_count } = await new ClerkClient(ctx).requestEnvelope(
      "/organization_roles",
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
