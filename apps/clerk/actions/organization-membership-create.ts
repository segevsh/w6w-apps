import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /organizations/{organization_id}/memberships` — adds an EXISTING user directly. This is
 * not the invitation flow (`organization-invitation-create`), which emails someone who may not
 * have an account yet; both users here must already exist in this Clerk instance.
 */
const action: ActionDefinition = {
  key: "organization-membership-create",
  type: "perform",
  resource: "organization-membership",
  title: "Add organization member",
  description: "Add an existing user to an organization with a given role.",
  idempotent: false,
  params: [
    ORGANIZATION_ID_PARAM,
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "role",
      label: "Role key",
      type: "string",
      required: true,
      default: "org:member",
      hint: "`organization-role-list` shows the roles configured for this instance.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "role", type: "string", label: "Role" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const userId = String(p.userId ?? "").trim();
    const role = String(p.role ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!userId) throw new Error("`userId` is required");
    if (!role) throw new Error("`role` is required");

    return await new ClerkClient(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}/memberships`,
      { method: "POST", body: { user_id: userId, role } },
    );
  },
};
export default action;
