import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, need, seg } from "../lib/client.ts";

interface Input {
  referenceId: string;
}

/** `DELETE /api/v2/emails/scheduled/{reference_id}` — irreversible. */
const deleteScheduledEmail: ActionDefinition<Input> = {
  key: "delete-scheduled-email",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Delete Scheduled Email",
  description: "Cancel a scheduled email by its reference ID before it is sent. Irreversible. " +
    "Needs the Sending Key.",
  params: [{
    key: "referenceId",
    label: "Reference ID",
    type: "string",
    required: true,
    hint: "The `referenceId` returned when the email was scheduled.",
  }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    need(input.referenceId, "referenceId");
    const { body } = await new MailerooClient(ctx).send(
      `/emails/scheduled/${seg(input.referenceId, "referenceId")}`,
      { method: "DELETE" },
    );
    return { deleted: true, message: (body as { message?: string } | undefined)?.message };
  },
};

export default deleteScheduledEmail;
