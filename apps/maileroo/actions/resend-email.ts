import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** `POST /v1/logs/email/:message_id/resend` (scope `user_logs.write`). 1000 resends / 24 h. */
const resendEmail: ActionDefinition<Input> = {
  key: "resend-email",
  type: "perform",
  idempotent: false,
  resource: "email-log",
  title: "Resend Email",
  description: "Requeue a previously sent email for another delivery attempt; it is reused " +
    "as-is under a new reference ID. Limited to 1000 resends per 24 hours. Account API Key " +
    "(user_logs.write).",
  params: [{
    key: "messageId",
    label: "Message ID",
    type: "string",
    required: true,
    hint: "The `message_id` of a log entry.",
  }],
  output: [{ key: "referenceId", type: "string", label: "Reference ID of the requeued email" }],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/logs/email/${seg(input.messageId, "messageId")}/resend`,
      { method: "POST" },
    );
    return { referenceId: (data as { reference_id?: string } | undefined)?.reference_id };
  },
};

export default resendEmail;
