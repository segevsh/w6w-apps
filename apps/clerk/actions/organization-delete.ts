import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /organizations/{organization_id}` — also deletes every membership and invitation for
 * the organization, and clears it from any active session that has it as the active organization.
 * Not reversible.
 */
const action: ActionDefinition = {
  key: "organization-delete",
  type: "perform",
  resource: "organization",
  title: "Delete organization",
  description: "Permanently delete an organization, its memberships, and its invitations.",
  idempotent: true,
  params: [
    ORGANIZATION_ID_PARAM,
    {
      key: "confirm",
      label: "I understand this is permanent",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to true — deleting an organization also deletes its " +
          "memberships and invitations, and cannot be undone",
      );
    }

    ctx.log("warn", "permanently deleting a Clerk organization", { organizationId: id });
    return await new ClerkClient(ctx).request(`/organizations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
export default action;
