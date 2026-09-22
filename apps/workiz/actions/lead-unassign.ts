import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { LeadLink } from "../lib/schema.ts";

/**
 * `POST /lead/unassign/` — remove the assigned user from a lead.
 *
 * The same body shape as `lead-assign` (`{UUID, User, auth_secret}`) and the
 * same bare-array `{LeadId, UUID, link}` response. `User` names whose
 * assignment to clear. Unassigning an unassigned lead is a no-op.
 */
interface Input {
  uuid: string;
  user: string;
  authSecret: string;
}

const leadUnassign: ActionDefinition<Input, LeadLink[]> = {
  key: "lead-unassign",
  type: "perform",
  resource: "lead",
  title: "Unassign Lead",
  description: "Remove a team member's assignment from a lead.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Lead UUID",
      type: "string",
      required: true,
      hint: "The lead's unique id.",
    },
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      hint: "The Workiz user whose assignment should be cleared.",
    },
    authSecretParam(),
  ],
  output: [
    { key: "LeadId", type: "string", label: "Lead id" },
    { key: "UUID", type: "string", label: "Lead UUID" },
    { key: "link", type: "string", label: "Web-app link" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json<LeadLink[]>("/lead/unassign/", {
      method: "POST",
      body: { UUID: input.uuid, User: input.user, auth_secret: input.authSecret },
    });
    return body ?? [];
  },
};

export default leadUnassign;
