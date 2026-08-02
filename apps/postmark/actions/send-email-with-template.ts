import type { ActionDefinition } from "@w6w/types";
import { compact, postmarkFetch, postmarkJsonInit } from "../lib/client.ts";

interface HeaderEntry {
  Name: string;
  Value: string;
}
interface Attachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentID?: string;
}

interface Input {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  templateId?: number;
  templateAlias?: string;
  templateModel: Record<string, unknown>;
  tag?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly" | "";
  inlineCss?: boolean;
  headers?: HeaderEntry[];
  attachments?: Attachment[];
  metadata?: Record<string, string>;
  messageStream?: string;
}

interface Output {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

/**
 * `POST /email/withTemplate` — render and send a saved template. Exactly one
 * of `templateId`/`templateAlias` is required.
 * https://postmarkapp.com/developer/api/templates-api#email-with-template
 */
const sendEmailWithTemplate: ActionDefinition<Input, Output> = {
  key: "send-email-with-template",
  type: "perform",
  resource: "message",
  title: "Send Email with Template",
  description: "Send a transactional email rendered from a saved Postmark template.",
  idempotent: false,
  params: [
    { key: "from", label: "From", type: "string", required: true },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Up to 50 comma-separated addresses.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    {
      key: "templateId",
      label: "Template ID",
      type: "number",
      hint: "Provide this or Template Alias.",
    },
    {
      key: "templateAlias",
      label: "Template Alias",
      type: "string",
      hint: "Provide this or Template ID.",
    },
    {
      key: "templateModel",
      label: "Template Model",
      type: "json",
      required: true,
      hint: "JSON object of merge variables the template references.",
    },
    { key: "tag", label: "Tag", type: "string" },
    { key: "replyTo", label: "Reply-To", type: "string" },
    { key: "trackOpens", label: "Track Opens", type: "boolean" },
    {
      key: "trackLinks",
      label: "Track Links",
      type: "select",
      default: "",
      options: [
        { value: "", label: "(server default)" },
        { value: "None", label: "None" },
        { value: "HtmlAndText", label: "HTML and Text" },
        { value: "HtmlOnly", label: "HTML Only" },
        { value: "TextOnly", label: "Text Only" },
      ],
    },
    { key: "inlineCss", label: "Inline CSS", type: "boolean" },
    { key: "headers", label: "Custom Headers", type: "json" },
    { key: "attachments", label: "Attachments", type: "json" },
    { key: "metadata", label: "Metadata", type: "json" },
    { key: "messageStream", label: "Message Stream", type: "string", default: "outbound" },
  ],
  output: [
    { key: "MessageID", type: "string", label: "Message ID" },
    { key: "To", type: "string", label: "Recipient(s)" },
    { key: "SubmittedAt", type: "string", label: "Submitted At" },
    { key: "ErrorCode", type: "number", label: "Error Code" },
    { key: "Message", type: "string", label: "Status Message" },
  ],

  async execute(input, ctx) {
    if (!input.templateId && !input.templateAlias) {
      throw new Error("send-email-with-template requires `templateId` or `templateAlias`");
    }
    const payload = compact({
      From: input.from,
      To: input.to,
      Cc: input.cc,
      Bcc: input.bcc,
      TemplateId: input.templateId,
      TemplateAlias: input.templateAlias,
      TemplateModel: input.templateModel ?? {},
      Tag: input.tag,
      ReplyTo: input.replyTo,
      TrackOpens: input.trackOpens,
      TrackLinks: input.trackLinks || undefined,
      InlineCss: input.inlineCss,
      Headers: input.headers,
      Attachments: input.attachments,
      Metadata: input.metadata,
      MessageStream: input.messageStream,
    });
    return await postmarkFetch<Output>(
      ctx,
      "/email/withTemplate",
      postmarkJsonInit("POST", payload),
    );
  },
};

export default sendEmailWithTemplate;
