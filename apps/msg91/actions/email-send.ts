import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, parseList, requireStr } from "../lib/client.ts";
import { json, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const addr = (email: string) => ({ email });

const emailSend: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  resource: "email",
  title: "Send Email",
  description:
    "Send an email from an MSG91 email template through a verified sending domain, with template variables.",
  idempotent: false,
  params: [
    str("templateId", "Template ID", {
      required: true,
      hint: "The email template's slug/ID from the Email section of MSG91.",
    }),
    str("domain", "Sending domain", {
      required: true,
      hint: "A domain verified in MSG91 (e.g. abc123.mailer91.com).",
    }),
    str("fromEmail", "From email", { required: true, hint: "Must be on the sending domain." }),
    str("fromName", "From name"),
    text("to", "To", { required: true, hint: "Comma-separated email addresses." }),
    text("cc", "Cc", { hint: "Comma-separated email addresses." }),
    text("bcc", "Bcc", { hint: "Comma-separated email addresses." }),
    str("replyTo", "Reply-to email"),
    json("variables", "Template variables", {
      hint: 'An object, e.g. {"company_name": "ABC", "otp": "1234"}; applied to every recipient.',
    }),
    json("attachments", "Attachments", {
      hint: 'Array of {"fileName": "…", "filePath": "https://…"} objects.',
    }),
  ],
  output: [
    { key: "uniqueId", type: "string", label: "Request unique ID" },
    { key: "message", type: "string", label: "MSG91's message" },
  ],

  async execute(input, ctx) {
    const to = parseList("to", input.to);
    if (to.length === 0) throw new Error("to is required");
    const cc = parseList("cc", input.cc);
    const bcc = parseList("bcc", input.bcc);
    const variables = parseJsonField("variables", input.variables);
    const attachments = parseJsonField("attachments", input.attachments);

    const recipient: Record<string, unknown> = { to: to.map(addr) };
    if (cc.length) recipient.cc = cc.map(addr);
    if (bcc.length) recipient.bcc = bcc.map(addr);
    if (variables) recipient.variables = variables;

    const from: Record<string, unknown> = { email: requireStr("fromEmail", input.fromEmail) };
    if (input.fromName) from.name = String(input.fromName);

    const body: Record<string, unknown> = {
      recipients: [recipient],
      from,
      domain: requireStr("domain", input.domain),
      template_id: requireStr("templateId", input.templateId),
    };
    if (input.replyTo) body.reply_to = [addr(String(input.replyTo))];
    if (attachments) body.attachments = attachments;

    const res = await call(ctx, "POST", "/email/send", { body });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return { uniqueId: data.unique_id ?? null, message: res.message ?? null };
  },
};

export default emailSend;
