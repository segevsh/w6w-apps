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
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  tag?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly" | "";
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
 * `POST /email` — send a single transactional email.
 * https://postmarkapp.com/developer/api/email-api
 */
const sendEmail: ActionDefinition<Input, Output> = {
  key: "send-email",
  type: "perform",
  resource: "message",
  title: "Send Email",
  description: "Send a single transactional email via Postmark. Provide `htmlBody` or `textBody`.",
  idempotent: false,
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Must be a registered and confirmed Sender Signature (or verified domain address).",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Up to 50 comma-separated addresses.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    { key: "htmlBody", label: "HTML Body", type: "text" },
    { key: "textBody", label: "Text Body", type: "text" },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: 'Used for stats/filtering, e.g. "invitation".',
    },
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
    {
      key: "headers",
      label: "Custom Headers",
      type: "json",
      hint: 'JSON array of `{"Name": "...", "Value": "..."}`.',
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: 'JSON array of `{"Name", "Content" (base64), "ContentType", "ContentID"?}`.',
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "JSON object of string key/value pairs.",
    },
    {
      key: "messageStream",
      label: "Message Stream",
      type: "string",
      default: "outbound",
      hint: 'Defaults to the server\'s transactional stream ("outbound").',
    },
  ],
  output: [
    { key: "MessageID", type: "string", label: "Message ID" },
    { key: "To", type: "string", label: "Recipient(s)" },
    { key: "SubmittedAt", type: "string", label: "Submitted At" },
    { key: "ErrorCode", type: "number", label: "Error Code" },
    { key: "Message", type: "string", label: "Status Message" },
  ],

  async execute(input, ctx) {
    if (!input.htmlBody && !input.textBody) {
      throw new Error("send-email requires `htmlBody` or `textBody`");
    }
    const payload = compact({
      From: input.from,
      To: input.to,
      Cc: input.cc,
      Bcc: input.bcc,
      Subject: input.subject,
      HtmlBody: input.htmlBody,
      TextBody: input.textBody,
      Tag: input.tag,
      ReplyTo: input.replyTo,
      TrackOpens: input.trackOpens,
      TrackLinks: input.trackLinks || undefined,
      Headers: input.headers,
      Attachments: input.attachments,
      Metadata: input.metadata,
      MessageStream: input.messageStream,
    });
    return await postmarkFetch<Output>(ctx, "/email", postmarkJsonInit("POST", payload));
  },
};

export default sendEmail;
