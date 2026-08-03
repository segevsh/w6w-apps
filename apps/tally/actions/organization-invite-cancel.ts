import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

interface Input {
  organizationId: string;
  inviteId: string;
}

/**
 * DELETE /organizations/{organizationId}/invites/{inviteId} — cancel a pending
 * invite. Responds 204, no body.
 */
const organizationInviteCancel: ActionDefinition<Input, Record<string, unknown>> = {
  key: "organization-invite-cancel",
  type: "perform",
  resource: "organization-invite",
  title: "Cancel Organization Invite",
  description: "Cancel a pending organization invite.",
  idempotent: true,
  params: [
    organizationIdParam,
    {
      key: "inviteId",
      label: "Invite ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Organization Invites.",
    },
  ],
  output: [
    { key: "inviteId", type: "string", label: "Cancelled invite ID" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "cancelling Tally organization invite", { inviteId: input.inviteId });
    await new TallyClient(ctx).request(
      `/organizations/${encodeURIComponent(input.organizationId)}/invites/${
        encodeURIComponent(input.inviteId)
      }`,
      { method: "DELETE" },
    );
    return { inviteId: input.inviteId, cancelled: true };
  },
};

export default organizationInviteCancel;
