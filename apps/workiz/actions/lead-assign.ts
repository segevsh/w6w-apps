import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { LeadLink } from "../lib/schema.ts";

/**
 * `POST /lead/assign/` — assign a user to a lead.
 *
 * Unlike markLost/activate this call addresses the lead in the **body**, not the
 * path: `{UUID, User, auth_secret}`. `User` is the Workiz user to assign — the
 * name/id the vendor's assign body expects.
 *
 * The response is a bare array of `{LeadId, UUID, link}`. Assigning the same
 * user twice leaves the lead assigned to them, so the call is safe to retry.
 */
interface Input {
  uuid: string;
  user: string;
  authSecret: string;
}

const leadAssign: ActionDefinition<Input, LeadLink[]> = {
  key: "lead-assign",
  type: "perform",
  resource: "lead",
  title: "Assign Lead",
  description: "Assign a team member to a lead.",
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
      hint: "The Workiz user to assign the lead to.",
    },
    authSecretParam(),
  ],
  output: [
    { key: "LeadId", type: "string", label: "Lead id" },
    { key: "UUID", type: "string", label: "Lead UUID" },
    { key: "link", type: "string", label: "Web-app link" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json<LeadLink[]>("/lead/assign/", {
      method: "POST",
      body: { UUID: input.uuid, User: input.user, auth_secret: input.authSecret },
    });
    return body ?? [];
  },
};

export default leadAssign;
