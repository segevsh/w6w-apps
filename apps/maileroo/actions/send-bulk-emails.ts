import type { ActionDefinition } from "@w6w/types";
import { compact, MailerooClient } from "../lib/client.ts";
import {
  asArray,
  asObject,
  checkReferenceId,
  checkSubject,
  fromObject,
  P,
  parseRecipients,
  requireRecipients,
} from "../lib/mail.ts";

interface Input {
  subject: string;
  messages: unknown;
  templateId?: number;
  html?: string;
  plain?: string;
  tracking?: boolean;
  tags?: unknown;
  headers?: unknown;
  attachments?: unknown;
}

interface MessageIn {
  from?: unknown;
  fromAddress?: unknown;
  fromName?: unknown;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  reply_to?: unknown;
  replyTo?: unknown;
  reference_id?: unknown;
  referenceId?: unknown;
  template_data?: unknown;
  templateData?: unknown;
}

/** One entry of `messages`, accepting the vendor's snake_case or this app's camelCase. */
function message(m: MessageIn, index: number) {
  const where = `messages[${index}]`;
  const fromRaw = m.from as { address?: unknown; display_name?: unknown } | string | undefined;
  const from = fromRaw && typeof fromRaw === "object"
    ? fromObject(fromRaw.address, fromRaw.display_name)
    : fromObject(m.fromAddress ?? fromRaw, m.fromName);
  const cc = parseRecipients(m.cc, `${where}.cc`);
  const bcc = parseRecipients(m.bcc, `${where}.bcc`);
  const replyTo = parseRecipients(m.reply_to ?? m.replyTo, `${where}.reply_to`);
  return compact({
    from,
    to: requireRecipients(m.to, `${where}.to`),
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    reply_to: replyTo.length ? replyTo : undefined,
    reference_id: checkReferenceId(m.reference_id ?? m.referenceId),
    template_data: asObject(m.template_data ?? m.templateData, `${where}.template_data`),
  });
}

/**
 * `POST /api/v2/emails/bulk` — up to 500 messages sharing one subject and body (an inline
 * `html`/`plain` template or a `template_id`), each personalised by its own `template_data`.
 * Scheduling is not available on this endpoint (Appendix). The answer is a list of reference
 * IDs, one per message, in order.
 */
const sendBulkEmails: ActionDefinition<Input> = {
  key: "send-bulk-emails",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Send Bulk Emails",
  description: "Send up to 500 personalised emails in one call: a shared subject and body (or " +
    "template) with per-message recipients and template data. Needs the Sending Key.",
  params: [
    {
      ...P.SUBJECT,
      hint: "Supports template variables, e.g. `Hi {{ first_name }}`.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array (max 500) of { fromAddress, fromName?, to, cc?, bcc?, replyTo?, referenceId?, " +
        "templateData? } — the vendor's own `from: {address, display_name}` form works too.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Use a Maileroo template, or provide HTML / plain text below.",
    },
    { key: "html", label: "HTML body", type: "text", hint: "Template variables are supported." },
    { key: "plain", label: "Plain-text body", type: "text" },
    P.TRACKING,
    P.TAGS,
    P.HEADERS,
    P.ATTACHMENTS,
  ],
  output: [
    { key: "referenceIds", type: "array", label: "Reference IDs, one per message, in order" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const list = asArray(input.messages, "messages") as MessageIn[] | undefined;
    if (!list?.length) throw new Error("messages is required");
    if (list.length > 500) throw new Error("messages may hold at most 500 entries");
    const templateId = input.templateId ? Number(input.templateId) : undefined;
    if (templateId !== undefined && (!Number.isInteger(templateId) || templateId < 1)) {
      throw new Error("templateId must be a positive integer");
    }
    if (!templateId && !input.html && !String(input.plain ?? "").trim()) {
      throw new Error("templateId, html or plain is required");
    }
    const body = compact({
      subject: checkSubject(input.subject),
      messages: list.map(message),
      template_id: templateId,
      html: input.html ? String(input.html) : undefined,
      plain: input.plain ? String(input.plain) : undefined,
      tracking: typeof input.tracking === "boolean" ? input.tracking : undefined,
      tags: asObject(input.tags, "tags"),
      headers: asObject(input.headers, "headers"),
      attachments: asArray(input.attachments, "attachments"),
    });
    const { data, body: raw } = await new MailerooClient(ctx).send("/emails/bulk", { body });
    return {
      referenceIds: (data as { reference_ids?: string[] } | undefined)?.reference_ids ?? [],
      message: (raw as { message?: string } | undefined)?.message,
    };
  },
};

export default sendBulkEmails;
