import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

interface Input {
  organizationId: string;
  emails: string;
  workspaceIds: string[];
}

/**
 * POST /organizations/{organizationId}/invites — invite people to workspaces.
 *
 * Responds 204 with no body, so there is no invite id to return — call Get Many
 * Organization Invites afterwards if you need one.
 *
 * Note the asymmetry in the documented request body, reproduced here rather
 * than smoothed over: `workspaceIds` is an **array of strings**, but `emails`
 * is a **single string** holding a comma- or semicolon-separated list.
 */
const organizationInviteCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "organization-invite-create",
  type: "perform",
  resource: "organization-invite",
  title: "Create Organization Invites",
  description: "Invite one or more email addresses to one or more workspaces.",
  // Re-inviting an already-invited address is not a documented no-op.
  idempotent: false,
  params: [
    organizationIdParam,
    {
      key: "emails",
      label: "Emails",
      type: "string",
      required: true,
      hint:
        "Comma- or semicolon-separated email addresses. Tally takes these as one string, not an array.",
    },
    {
      key: "workspaceIds",
      label: "Workspace IDs",
      type: "multiselect",
      required: true,
      hint: "Workspaces the invitees get access to. Get IDs from Get Many Workspaces.",
    },
  ],
  output: [
    { key: "emails", type: "string", label: "Invited addresses" },
    { key: "invited", type: "boolean", label: "Invites accepted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Tally organization invites", {
      organizationId: input.organizationId,
    });
    await new TallyClient(ctx).request(
      `/organizations/${encodeURIComponent(input.organizationId)}/invites`,
      { method: "POST", body: { emails: input.emails, workspaceIds: input.workspaceIds } },
    );
    return { emails: input.emails, invited: true };
  },
};

export default organizationInviteCreate;
