import type { ActionDefinition } from "@w6w/types";
import { compact, LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `POST /v1.0/message/email/send` — email a lead.
 *
 * Sent through the connection's own Lofty outgoing email configuration, and
 * answers `{ messageId, toEmail, subject }`.
 *
 * ## The recipient falls back to the lead's address
 *
 * `subject`, `content` and `leadId` are required; `toEmail` is optional. When
 * it is omitted, or does not match an address Lofty holds for the lead, Lofty
 * uses the lead's own email. The response echoes the address actually used.
 *
 * ## Sending twice sends twice
 *
 * No deduplication key exists, so a retried step sends a second email.
 * `idempotent` is `false`.
 */
interface Input {
  leadId: number;
  subject: string;
  content: string;
  toEmail?: string;
}

const action: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  resource: "message",
  title: "Send Email",
  description:
    "Send an email to a lead through the Lofty account's outgoing email (POST /v1.0/message/email/send).",
  idempotent: false,
  params: [
    leadIdParam,
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "content", label: "Body", type: "text", required: true },
    {
      key: "toEmail",
      label: "To email",
      type: "string",
      hint: "Optional. Omit to use the lead's own email — the response reports which was used.",
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "Email message ID" },
    { key: "toEmail", type: "string", label: "Address used" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  execute(input, ctx) {
    const body = compact({
      leadId: input.leadId,
      subject: input.subject,
      content: input.content,
      toEmail: input.toEmail,
    });
    return new LoftyClient(ctx).request("/message/email/send", { method: "POST", body });
  },
};

export default action;
