import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /user_management/invitations` — invite somebody into a customer's
 * organization, instead of granting them access outright.
 *
 * This is the safe counterpart to `organization-membership-create`. That action
 * grants immediately; this one sends an email and waits for the person to
 * accept, which means **the recipient proves they control the address before
 * they get in**. When the address came from anywhere a user could influence, an
 * invitation is the correct call and a membership is not.
 *
 * WorkOS creates the user on acceptance if one does not exist, so an invitation
 * works for somebody who has never signed in — the case `user-create` plus a
 * membership handles clumsily.
 *
 * `inviter_user_id` matters more than it looks: it is what the email says, and
 * an invitation apparently from nobody is the one people report as phishing.
 */
const action: ActionDefinition = {
  key: "invitation-send",
  type: "perform",
  resource: "invitation",
  title: "Invite a user to an organization",
  description:
    "Email an invitation instead of granting access outright — the recipient proves they " +
    "control the address before they get in. The safe counterpart to adding a membership.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "roleSlug",
      label: "Role Slug",
      type: "string",
      default: "",
      hint: "The role they get on acceptance. Blank uses the environment default.",
    },
    {
      key: "inviterUserId",
      label: "Inviter User ID",
      type: "string",
      default: "",
      hint: "Whose name the email carries. An invitation apparently from nobody is the one " +
        "people report as phishing.",
    },
    {
      key: "expiresInDays",
      label: "Expires In (days)",
      type: "number",
      default: 7,
      advanced: true,
      hint: "1–30. WorkOS defaults to 7.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "state", type: "string", label: "State" },
    { key: "expires_at", type: "string", label: "Expiry" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    const organizationId = String(p.organizationId ?? "").trim();
    if (!email) throw new Error("`email` is required");
    if (!organizationId) throw new Error("`organizationId` is required");

    const days = p.expiresInDays === undefined ? 7 : Number(p.expiresInDays);
    if (!Number.isFinite(days) || days < 1 || days > 30) {
      throw new Error("`expiresInDays` must be between 1 and 30");
    }

    const invitation = await new WorkOSClient(ctx).request<{ id?: string }>(
      "/user_management/invitations",
      {
        method: "POST",
        body: compact({
          email,
          organization_id: organizationId,
          role_slug: p.roleSlug,
          inviter_user_id: p.inviterUserId,
          expires_in_days: days,
        }),
      },
    );
    // The invitation id and the organization; not the address.
    ctx.log("info", "sent a WorkOS invitation", {
      invitationId: invitation?.id,
      organizationId,
    });
    return invitation;
  },
};

export default action;
