import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";

/**
 * `POST /invitations/{invitation_id}/revoke` — invalidates the link, but does NOT stop the invited
 * address from signing up directly through the ordinary sign-up flow. Revoking is a courtesy, not
 * an access block.
 */
const action: ActionDefinition = {
  key: "invitation-revoke",
  type: "perform",
  resource: "invitation",
  title: "Revoke application invitation",
  description: "Revoke a pending application invitation. Does not prevent the invitee from " +
    "signing up on their own through the regular sign-up flow.",
  idempotent: true,
  params: [
    { key: "invitationId", label: "Invitation ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "revoked", type: "boolean", label: "Revoked" },
  ],

  async execute(input, ctx) {
    const invitationId = String((input as Record<string, unknown>).invitationId ?? "").trim();
    if (!invitationId) throw new Error("`invitationId` is required");
    return await new ClerkClient(ctx).request(
      `/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: "POST" },
    );
  },
};
export default action;
