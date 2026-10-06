import type { ActionDefinition } from "@w6w/types";
import { ses, toList, toTags } from "../lib/api.ts";

/**
 * SendEmail — `POST /v2/email/outbound-emails`, `Content.Simple`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html
 *
 * Idempotency: SendEmail takes no client token, so a retry sends a second message.
 */
interface Input {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  configurationSetName?: string;
  tags?: unknown;
}

const action: ActionDefinition<Input, { messageId: string }> = {
  key: "send-email",
  type: "perform",
  resource: "email",
  title: "Send Email",
  description: "Send a simple email (subject plus a text and/or HTML body) through Amazon SES.",
  idempotent: false,
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "A verified identity, optionally `Name <addr@example.com>`.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "One or more addresses, comma-separated.",
    },
    { key: "cc", label: "Cc", type: "string", hint: "Comma-separated." },
    { key: "bcc", label: "Bcc", type: "string", hint: "Comma-separated." },
    { key: "replyTo", label: "Reply-To", type: "string", hint: "Comma-separated." },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "textBody", label: "Text body", type: "text" },
    { key: "htmlBody", label: "HTML body", type: "text" },
    {
      key: "configurationSetName",
      label: "Configuration set",
      type: "string",
      hint: "Applies event publishing, tracking and sending-pool rules.",
    },
    {
      key: "tags",
      label: "Message tags",
      type: "json",
      hint: 'An object like {"campaign":"welcome"}; attached to the message\'s sending events.',
    },
  ],
  output: [{ key: "messageId", type: "string", label: "SES message ID" }],

  async execute(input, ctx) {
    if (!input.textBody && !input.htmlBody) {
      throw new Error("Provide a text body, an HTML body, or both.");
    }
    const to = toList(input.to);
    if (!to) throw new Error("At least one To address is required.");
    ctx.log("info", "sending SES email", { to: to.length });

    const res = await ses<{ MessageId: string }>(ctx, {
      op: "SendEmail",
      method: "POST",
      path: "/v2/email/outbound-emails",
      body: {
        FromEmailAddress: input.from,
        Destination: {
          ToAddresses: to,
          CcAddresses: toList(input.cc),
          BccAddresses: toList(input.bcc),
        },
        ReplyToAddresses: toList(input.replyTo),
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: "UTF-8" },
            Body: {
              ...(input.textBody ? { Text: { Data: input.textBody, Charset: "UTF-8" } } : {}),
              ...(input.htmlBody ? { Html: { Data: input.htmlBody, Charset: "UTF-8" } } : {}),
            },
          },
        },
        ConfigurationSetName: input.configurationSetName || undefined,
        EmailTags: toTags(input.tags),
      },
    });
    return { messageId: res.MessageId };
  },
};

export default action;
