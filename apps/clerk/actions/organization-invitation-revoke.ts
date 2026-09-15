import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/** `POST /organizations/{organization_id}/invitations/{invitation_id}/revoke` — pending only. */
const action: ActionDefinition = {
  key: "organization-invitation-revoke",
  type: "perform",
  resource: "organization-invitation",
  title: "Revoke organization invitation",
  description: "Revoke a pending organization invitation so the link can no longer be used.",
  idempotent: true,
  params: [
    ORGANIZATION_ID_PARAM,
    { key: "invitationId", label: "Invitation ID", type: "string", required: true, default: "" },
    {
      key: "requestingUserId",
      label: "Requesting user ID",
      type: "string",
      default: "",
      hint: "Must be an admin member of the organization.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const invitationId = String(p.invitationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!invitationId) throw new Error("`invitationId` is required");

    return await new ClerkClient(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}/invitations/${
        encodeURIComponent(invitationId)
      }/revoke`,
      { method: "POST", body: compact({ requesting_user_id: p.requestingUserId }) },
    );
  },
};
export default action;
