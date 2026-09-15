import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS, ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /organizations/{organization_id}/invitations` — enveloped (`{ data, total_count }`), and
 * deliberately excludes invitations created as a side effect of an Organization Domain (auto-join
 * via a verified email domain) — this only lists ones sent directly.
 */
const action: ActionDefinition = {
  key: "organization-invitation-list",
  type: "read",
  resource: "organization-invitation",
  title: "List organization invitations",
  description: "List pending/accepted/revoked/expired invitations for an organization.",
  params: [
    ORGANIZATION_ID_PARAM,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "accepted", label: "Accepted" },
        { value: "revoked", label: "Revoked" },
        { value: "expired", label: "Expired" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Invitations" },
    { key: "totalCount", type: "number", label: "Total matching" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");

    const { data, total_count } = await new ClerkClient(ctx).requestEnvelope(
      `/organizations/${encodeURIComponent(organizationId)}/invitations`,
      {
        query: {
          status: p.status as string | undefined,
          limit: (p.limit as number | undefined) ?? 10,
          offset: (p.offset as number | undefined) ?? 0,
        },
      },
    );
    return { data, totalCount: total_count };
  },
};
export default action;
