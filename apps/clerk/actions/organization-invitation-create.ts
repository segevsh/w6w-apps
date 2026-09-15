import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /organizations/{organization_id}/invitations` — for someone who is not a member yet
 * (and may not have a Clerk account at all). Only organization admins may send one; `inviterUserId`
 * must belong to an "admin" member. To add an existing user directly, use
 * `organization-membership-create` instead.
 */
const action: ActionDefinition = {
  key: "organization-invitation-create",
  type: "perform",
  resource: "organization-invitation",
  title: "Invite to organization",
  description: "Invite someone to an organization by email, sending them a join link.",
  idempotent: false,
  params: [
    ORGANIZATION_ID_PARAM,
    { key: "emailAddress", label: "Email address", type: "string", required: true, default: "" },
    { key: "role", label: "Role key", type: "string", required: true, default: "org:member" },
    {
      key: "inviterUserId",
      label: "Inviter user ID",
      type: "string",
      default: "",
      hint: "Must be an admin member of the organization.",
    },
    { key: "redirectUrl", label: "Redirect URL", type: "string", default: "", advanced: true },
    {
      key: "expiresInDays",
      label: "Expires in (days)",
      type: "number",
      default: 30,
      advanced: true,
      validation: { min: 1, max: 365 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const emailAddress = String(p.emailAddress ?? "").trim();
    const role = String(p.role ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!emailAddress) throw new Error("`emailAddress` is required");
    if (!role) throw new Error("`role` is required");

    return await new ClerkClient(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}/invitations`,
      {
        method: "POST",
        body: compact({
          email_address: emailAddress,
          role,
          inviter_user_id: p.inviterUserId,
          redirect_url: p.redirectUrl,
          expires_in_days: p.expiresInDays,
        }),
      },
    );
  },
};
export default action;
