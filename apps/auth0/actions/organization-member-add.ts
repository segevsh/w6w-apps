import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, csv } from "../lib/client.ts";

/**
 * `POST /api/v2/organizations/{id}/members` — put users into an organization.
 *
 * The B2B provisioning call: it is what turns an Auth0 user into a member of a
 * particular customer. Adding somebody who is already a member is not an error,
 * so it is safe to re-run.
 *
 * **Membership and roles are two steps.** This adds the person; granting them a
 * role *within* the organization is a separate call on
 * `/organizations/{id}/members/{userId}/roles`. A workflow that adds a member
 * and expects them to have permissions has done half the job — and the half it
 * skipped is the one that grants access.
 *
 * The user must already exist at the tenant: an organization is a grouping of
 * existing users, not a place users are created.
 */
const action: ActionDefinition = {
  key: "organization-member-add",
  type: "perform",
  resource: "organization",
  title: "Add members to an organization",
  description:
    "Add existing users to an organization. Membership alone grants nothing — roles inside the " +
    "organization are a separate step.",
  idempotent: true,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "org_abc123",
    },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated Auth0 user ids. They must already exist at the tenant.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Added" },
    { key: "userIds", type: "array", label: "User IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    const members = csv(p.userIds);
    if (!members) throw new Error("`userIds` is required");

    ctx.log("info", "adding Auth0 organization members", { organizationId, count: members.length });
    await new Auth0Client(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      { method: "POST", body: { members } },
    );
    return { ok: true, userIds: members };
  },
};

export default action;
