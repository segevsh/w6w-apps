import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact, json } from "../lib/client.ts";

/**
 * `POST /invitations` — invites someone to the **application itself** (not an organization; see
 * `organization-invitation-create` for that). Clerk refuses a second invitation for the same
 * address unless `ignoreExisting` is set, and refuses one outright for an address that already has
 * an account.
 */
const action: ActionDefinition = {
  key: "invitation-create",
  type: "perform",
  resource: "invitation",
  title: "Invite to application",
  description: "Invite someone by email to sign up for this application.",
  idempotent: false,
  params: [
    { key: "emailAddress", label: "Email address", type: "string", required: true, default: "" },
    { key: "redirectUrl", label: "Redirect URL", type: "string", default: "", advanced: true },
    {
      key: "ignoreExisting",
      label: "Re-invite even if one already exists",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "expiresInDays",
      label: "Expires in (days)",
      type: "number",
      default: 30,
      advanced: true,
      validation: { min: 1, max: 365 },
    },
    {
      key: "publicMetadata",
      label: "Public metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Copied onto the new user's public metadata once the invitation is accepted.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailAddress = String(p.emailAddress ?? "").trim();
    if (!emailAddress) throw new Error("`emailAddress` is required");

    return await new ClerkClient(ctx).request("/invitations", {
      method: "POST",
      body: compact({
        email_address: emailAddress,
        redirect_url: p.redirectUrl,
        ignore_existing: p.ignoreExisting === true ? true : undefined,
        expires_in_days: p.expiresInDays,
        public_metadata: json(p.publicMetadata, "publicMetadata"),
      }),
    });
  },
};
export default action;
