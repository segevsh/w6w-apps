import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

const action: ActionDefinition = {
  key: "organization-membership-remove",
  type: "perform",
  resource: "organization-membership",
  title: "Remove organization member",
  description: "Remove a member from an organization. The user account itself is untouched.",
  idempotent: true,
  params: [
    ORGANIZATION_ID_PARAM,
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const userId = String(p.userId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!userId) throw new Error("`userId` is required");

    return await new ClerkClient(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}/memberships/${
        encodeURIComponent(userId)
      }`,
      { method: "DELETE" },
    );
  },
};
export default action;
