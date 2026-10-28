import type { ActionDefinition } from "@w6w/types";
import { MandrillClient, parseRecipients } from "../lib/client.ts";

interface Attachment {
  type: string;
  name: string;
  content: string;
}

interface Input {
  fromEmail: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html?: string;
  text?: string;
  important?: boolean;
  trackOpens?: boolean;
  trackClicks?: boolean;
  autoText?: boolean;
  inlineCss?: boolean;
  tags?: string[] | string;
  headers?: Record<string, string>;
  globalMergeVars?: Record<string, unknown> | Array<{ name: string; content: unknown }>;
  mergeVars?: Array<{ rcpt: string; vars: Array<{ name: string; content: unknown }> }>;
  attachments?: Attachment[];
  subaccount?: string;
  async?: boolean;
  ipPool?: string;
  sendAt?: string;
}

/** Accepts `{name: content}` or an already-shaped `[{name, content}]` array. */
function toMergeVarArray(
  input: Record<string, unknown> | Array<{ name: string; content: unknown }> | undefined,
): Array<{ name: string; content: unknown }> | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) return input;
  return Object.entries(input).map(([name, content]) => ({ name, content }));
}

const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a transactional email via Mandrill (POST /messages/send.json). Provide `html` or `text`.",
  idempotent: false,
  params: [
    { key: "fromEmail", label: "From Email", type: "string", required: true },
    { key: "fromName", label: "From Name", type: "string" },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated list, or `Name <email>` form.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "html", label: "HTML Content", type: "text" },
    { key: "text", label: "Text Content", type: "text" },
    { key: "important", label: "Important", type: "boolean" },
    { key: "trackOpens", label: "Track Opens", type: "boolean" },
    { key: "trackClicks", label: "Track Clicks", type: "boolean" },
    { key: "autoText", label: "Auto-generate text from HTML", type: "boolean" },
    { key: "inlineCss", label: "Inline CSS", type: "boolean" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated list or JSON array." },
    { key: "headers", label: "Custom Headers", type: "json" },
    {
      key: "globalMergeVars",
      label: "Global Merge Vars",
      type: "json",
      hint: 'JSON object `{"name": "value"}` or array of `{name, content}`.',
    },
    {
      key: "mergeVars",
      label: "Per-Recipient Merge Vars",
      type: "json",
      hint: "JSON array of `{rcpt, vars: [{name, content}]}`.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "JSON array of `{type, name, content}` (base64-encoded content).",
    },
    { key: "subaccount", label: "Subaccount", type: "string" },
    { key: "async", label: "Send asynchronously", type: "boolean", default: false },
    { key: "ipPool", label: "IP Pool", type: "string" },
    {
      key: "sendAt",
      label: "Send At",
      type: "datetime",
      hint: "UTC timestamp to schedule delivery; omit to send immediately.",
    },
  ],
  output: [
    { key: "email", type: "string", label: "Recipient" },
    { key: "status", type: "string", label: "Status" },
    { key: "_id", type: "string", label: "Message ID" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    const to = [
      ...parseRecipients(input.to, "to"),
      ...parseRecipients(input.cc, "cc"),
      ...parseRecipients(input.bcc, "bcc"),
    ];
    const message: Record<string, unknown> = {
      from_email: input.fromEmail,
      to,
      subject: input.subject,
    };
    if (input.fromName) message.from_name = input.fromName;
    if (input.html) message.html = input.html;
    if (input.text) message.text = input.text;
    if (input.important !== undefined) message.important = input.important;
    if (input.trackOpens !== undefined) message.track_opens = input.trackOpens;
    if (input.trackClicks !== undefined) message.track_clicks = input.trackClicks;
    if (input.autoText !== undefined) message.auto_text = input.autoText;
    if (input.inlineCss !== undefined) message.inline_css = input.inlineCss;
    if (input.tags) {
      message.tags = Array.isArray(input.tags)
        ? input.tags
        : input.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (input.headers) message.headers = input.headers;
    const globalMergeVars = toMergeVarArray(input.globalMergeVars);
    if (globalMergeVars) message.global_merge_vars = globalMergeVars;
    if (input.mergeVars) message.merge_vars = input.mergeVars;
    if (input.attachments && input.attachments.length) message.attachments = input.attachments;
    if (input.subaccount) message.subaccount = input.subaccount;

    const body: Record<string, unknown> = { message, async: input.async ?? false };
    if (input.ipPool) body.ip_pool = input.ipPool;
    if (input.sendAt) body.send_at = input.sendAt;

    return client.request("/messages/send.json", body);
  },
};

export default sendMessage;
