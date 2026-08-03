import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  type MailjetAddress,
  MailjetClient,
  parseAddress,
  parseAddressList,
  SEND_V31,
} from "../lib/client.ts";

interface Input {
  from: string;
  to: string;
  subject?: string;
  textPart?: string;
  htmlPart?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  customId?: string;
  variables?: Record<string, unknown>;
  attachments?: unknown[];
  inlinedAttachments?: unknown[];
  sandboxMode?: boolean;
}

/** One entry of the v3.1 `Messages` array. */
export interface MailjetMessage {
  From?: MailjetAddress;
  To?: MailjetAddress[];
  Cc?: MailjetAddress[];
  Bcc?: MailjetAddress[];
  ReplyTo?: MailjetAddress;
  Subject?: string;
  TextPart?: string;
  HTMLPart?: string;
  TemplateID?: number;
  TemplateLanguage?: boolean;
  Variables?: Record<string, unknown>;
  CustomID?: string;
  Attachments?: unknown[];
  InlinedAttachments?: unknown[];
}

/**
 * The v3.1 Send API response. Note `Status` is **per message**, and Mailjet
 * returns the array whether or not every entry succeeded — see the description
 * below and README.md "Partial failure".
 */
export interface SendResponse {
  Messages?: Array<{
    Status?: string;
    CustomID?: string;
    To?: Array<{ Email?: string; MessageUUID?: string; MessageID?: number; MessageHref?: string }>;
    Cc?: unknown[];
    Bcc?: unknown[];
    Errors?: Array<{
      ErrorIdentifier?: string;
      ErrorCode?: string;
      StatusCode?: number;
      ErrorMessage?: string;
      ErrorRelatedTo?: string[];
    }>;
  }>;
}

/**
 * Build the v3.1 `Messages` array for a single message. Exported so
 * `send-template-email` can reuse the address parsing and `compact` rules
 * without duplicating them.
 */
export function buildMessage(input: Input & { templateId?: number }): MailjetMessage {
  return compact({
    From: parseAddress(input.from),
    To: parseAddressList(input.to),
    Cc: parseAddressList(input.cc).length ? parseAddressList(input.cc) : undefined,
    Bcc: parseAddressList(input.bcc).length ? parseAddressList(input.bcc) : undefined,
    ReplyTo: parseAddress(input.replyTo),
    Subject: input.subject,
    TextPart: input.textPart,
    HTMLPart: input.htmlPart,
    CustomID: input.customId,
    Variables: input.variables,
    Attachments: input.attachments?.length ? input.attachments : undefined,
    InlinedAttachments: input.inlinedAttachments?.length ? input.inlinedAttachments : undefined,
  }) as MailjetMessage;
}

const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  /** Retrying delivers the email twice. */
  idempotent: false,
  resource: "email",
  title: "Send Email",
  description:
    "Send one transactional email via the v3.1 Send API (POST /v3.1/send). At least one of " +
    "`textPart` or `htmlPart` is required. NOTE: Mailjet reports per-message failures inside a " +
    "200 response — check `Messages[0].Status` is `success`, not just the HTTP status.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "`addr@example.com` or `Name <addr@example.com>`. Must be a validated Mailjet sender.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint:
        "Comma-separated addresses, `Name <addr>` accepted, or a JSON array of `{Email, Name?}`.",
    },
    { key: "subject", label: "Subject", type: "string" },
    { key: "textPart", label: "Text body", type: "text" },
    { key: "htmlPart", label: "HTML body", type: "text" },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "replyTo", label: "Reply-To", type: "string" },
    {
      key: "customId",
      label: "Custom ID",
      type: "string",
      hint: "Your own reference, echoed back on the response and on event webhooks.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "Substitution values for `{{var:name}}` placeholders in the content.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "JSON array of `{ContentType, Filename, Base64Content}`.",
    },
    {
      key: "inlinedAttachments",
      label: "Inlined attachments",
      type: "json",
      hint: "As `attachments`, plus `ContentID` for referencing with `cid:`.",
    },
    {
      key: "sandboxMode",
      label: "Sandbox mode",
      type: "boolean",
      hint: "Validate the payload and return the usual response without delivering anything.",
    },
  ],
  output: [
    {
      key: "Messages",
      type: "array",
      label: "Messages",
    },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    const body: Record<string, unknown> = { Messages: [buildMessage(input)] };
    if (input.sandboxMode) body.SandboxMode = true;
    return client.request<SendResponse>(SEND_V31, { method: "POST", body });
  },
};

export default sendEmail;
