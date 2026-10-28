import type { ActionDefinition } from "@w6w/types";
import { MandrillClient, parseRecipients } from "../lib/client.ts";

interface Attachment {
  type: string;
  name: string;
  content: string;
}

interface Input {
  templateName: string;
  fromEmail?: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  templateContent?: Array<{ name: string; content: unknown }>;
  mergeLanguage?: "mailchimp" | "handlebars";
  globalMergeVars?: Record<string, unknown> | Array<{ name: string; content: unknown }>;
  mergeVars?: Array<{ rcpt: string; vars: Array<{ name: string; content: unknown }> }>;
  tags?: string[] | string;
  headers?: Record<string, string>;
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

const sendTemplateMessage: ActionDefinition<Input> = {
  key: "send-template-message",
  type: "perform",
  resource: "message",
  title: "Send Message from Template",
  description:
    "Send a transactional email via an existing Mandrill template (POST /messages/send-template.json).",
  idempotent: false,
  params: [
    {
      key: "templateName",
      label: "Template Name",
      type: "string",
      required: true,
      hint: "The published template's `name` or `slug`.",
    },
    {
      key: "fromEmail",
      label: "From Email",
      type: "string",
      hint: "Overrides the template's default sender when set.",
    },
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
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Overrides the template's default subject.",
    },
    {
      key: "templateContent",
      label: "Template Content",
      type: "json",
      hint: "JSON array of `{name, content}` for the template's editable regions.",
    },
    {
      key: "mergeLanguage",
      label: "Merge Language",
      type: "select",
      options: [
        { value: "mailchimp", label: "Mailchimp (*|VAR|*)" },
        { value: "handlebars", label: "Handlebars ({{var}})" },
      ],
      default: "mailchimp",
    },
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
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated list or JSON array." },
    { key: "headers", label: "Custom Headers", type: "json" },
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
    const message: Record<string, unknown> = { to };
    if (input.fromEmail) message.from_email = input.fromEmail;
    if (input.fromName) message.from_name = input.fromName;
    if (input.subject) message.subject = input.subject;
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

    const body: Record<string, unknown> = {
      template_name: input.templateName,
      template_content: input.templateContent ?? [],
      message,
      async: input.async ?? false,
    };
    if (input.mergeLanguage) body.merge_language = input.mergeLanguage;
    if (input.ipPool) body.ip_pool = input.ipPool;
    if (input.sendAt) body.send_at = input.sendAt;

    return client.request("/messages/send-template.json", body);
  },
};

export default sendTemplateMessage;
