import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /user_management/organization_memberships` — grant somebody access to a
 * customer's account.
 *
 * This is a **grant**, and it is worth naming as one. Adding a membership puts
 * a person inside a customer's tenant with a role, immediately, with no
 * invitation and no acceptance step — which is exactly right for provisioning
 * driven by the customer's own directory, and exactly wrong as a response to
 * anything a user supplied.
 *
 * ## The role slug is yours, and a wrong one is silent
 *
 * `role_slug` names a role you defined in WorkOS. Omitting it grants the
 * environment's **default role**, which is a real assignment rather than none —
 * so a workflow that forgets the field does not fail, it grants whatever the
 * default happens to be. This action makes the role explicit for that reason,
 * with the fallback documented rather than hidden.
 */
const action: ActionDefinition = {
  key: "organization-membership-create",
  type: "perform",
  resource: "organization-membership",
  title: "Add a user to an organization",
  description: "Grant a person access to a customer's account with a role — immediately, with no " +
    "invitation step. Omitting the role grants the environment default, not nothing.",
  idempotent: false,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
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
      placeholder: "member",
      hint: "A role you defined in WorkOS. Left blank, WorkOS grants the environment's DEFAULT " +
        "role — which is an assignment, not an absence of one.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    const organizationId = String(p.organizationId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    if (!organizationId) throw new Error("`organizationId` is required");
    const roleSlug = String(p.roleSlug ?? "").trim();

    if (!roleSlug) {
      ctx.log("info", "granting a membership with no role — WorkOS will apply the default role", {
        organizationId,
      });
    }

    return await new WorkOSClient(ctx).request(
      "/user_management/organization_memberships",
      {
        method: "POST",
        body: compact({
          user_id: userId,
          organization_id: organizationId,
          role_slug: roleSlug,
        }),
      },
    );
  },
};

export default action;
