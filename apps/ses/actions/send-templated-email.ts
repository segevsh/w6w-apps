import type { ActionDefinition } from "@w6w/types";
import { ses, templateData, toList, toTags } from "../lib/api.ts";

/**
 * SendEmail with `Content.Template` — render a stored template with per-message data.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Template.html
 */
interface Input {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  templateName: string;
  templateData?: unknown;
  configurationSetName?: string;
  tags?: unknown;
}

const action: ActionDefinition<Input, { messageId: string }> = {
  key: "send-templated-email",
  type: "perform",
  resource: "email",
  title: "Send Templated Email",
  description: "Send an email rendered from a stored SES template and a data object.",
  idempotent: false,
  params: [
    { key: "from", label: "From", type: "string", required: true },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated.",
    },
    { key: "cc", label: "Cc", type: "string", hint: "Comma-separated." },
    { key: "bcc", label: "Bcc", type: "string", hint: "Comma-separated." },
    { key: "replyTo", label: "Reply-To", type: "string", hint: "Comma-separated." },
    { key: "templateName", label: "Template name", type: "string", required: true },
    {
      key: "templateData",
      label: "Template data",
      type: "json",
      hint: 'Values for the template\'s {{placeholders}}, e.g. {"name":"Ada"}. Max 256 KB.',
    },
    { key: "configurationSetName", label: "Configuration set", type: "string" },
    { key: "tags", label: "Message tags", type: "json" },
  ],
  output: [{ key: "messageId", type: "string", label: "SES message ID" }],

  async execute(input, ctx) {
    const to = toList(input.to);
    if (!to) throw new Error("At least one To address is required.");
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
          Template: {
            TemplateName: input.templateName,
            TemplateData: templateData(input.templateData) ?? "{}",
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
