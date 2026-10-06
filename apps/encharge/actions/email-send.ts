import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, jsonValue } from "../lib/client.ts";

/**
 * Send Transactional Email — `POST /v1/emails/send`. Verified against the Transactional Email
 * API reference and guides (docs.encharge.io/transactional-email-api/*), fetched 2026-10-06:
 * exactly one of `template` (a name, or a numeric id), `html` or `text`; `to`, `from`, `reply`
 * are an address or an object (`{userId}` for `to`, `{email, name}` for `from`/`reply`);
 * `subject` is used by the html and text guides; success is `202 Accepted`.
 *
 * Encharge creates the recipient as a person when they are not already in the account, and by
 * default skips people who have unsubscribed (`unsubscribeCheck`).
 */
interface Input {
  to?: string;
  toUserId?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  replyToName?: string;
  subject?: string;
  template?: string | number;
  html?: string;
  text?: string;
  templateProperties?: unknown;
  unsubscribeCheck?: boolean;
  utmTags?: boolean;
  cc?: string;
  bcc?: string;
}

const emailSend: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  resource: "emails",
  title: "Send Transactional Email",
  description: "Send one email through Encharge, from a template or as custom HTML or plain " +
    "text. Give exactly one of Template, HTML or Text.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Recipient address. Leave empty and set `To (user ID)` to use the address Encharge " +
        "already holds for a person.",
    },
    {
      key: "toUserId",
      label: "To (user ID)",
      type: "string",
      hint: "The userId of a person already in Encharge.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "Sender address. Required for HTML and text emails; overrides the template's sender.",
    },
    { key: "fromName", label: "From name", type: "string" },
    { key: "replyTo", label: "Reply-to", type: "string" },
    { key: "replyToName", label: "Reply-to name", type: "string" },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Required for HTML and text emails.",
    },
    {
      key: "template",
      label: "Template",
      type: "string",
      hint: "An email template's name, or its numeric id (from the template's URL).",
    },
    { key: "html", label: "HTML", type: "code", hint: "Custom HTML body." },
    { key: "text", label: "Text", type: "text", hint: "Plain-text body." },
    {
      key: "templateProperties",
      label: "Template properties (JSON)",
      type: "json",
      hint: 'Values for {{ placeholders }}, e.g. {"loginURL":"https://…"}.',
    },
    {
      key: "unsubscribeCheck",
      label: "Skip unsubscribed people",
      type: "boolean",
      default: true,
      hint: "Turn off only with care: mailing unsubscribers risks spam reports and suspension.",
    },
    {
      key: "utmTags",
      label: "Add UTM tags to links",
      type: "boolean",
      hint: "Only matters when automatic UTM tagging is on in the account; false disables it.",
    },
    { key: "cc", label: "CC", type: "string", hint: "Comma-separated addresses." },
    { key: "bcc", label: "BCC", type: "string", hint: "Comma-separated addresses." },
  ],
  output: [{
    key: "ok",
    type: "boolean",
    label: "True when Encharge accepted the email (HTTP 202)",
  }],

  async execute(input, ctx) {
    const content = [input.template, input.html, input.text].filter((v) =>
      v !== undefined && v !== null && String(v).trim() !== ""
    );
    if (content.length !== 1) {
      throw new Error("Give exactly one of `template`, `html` or `text`.");
    }
    const to = (input.to ?? "").trim();
    const toUserId = (input.toUserId ?? "").trim();
    if (!to && !toUserId) throw new Error("Give `to` (an address) or `toUserId`.");

    const body: Record<string, unknown> = { to: to || { userId: toUserId } };
    if (input.template !== undefined && String(input.template).trim() !== "") {
      const t = String(input.template).trim();
      // The docs: "To use the template ID instead of the template name, pass a number".
      body.template = /^\d+$/.test(t) ? Number(t) : t;
    }
    if (input.html) body.html = input.html;
    if (input.text) body.text = input.text;
    if (input.subject) body.subject = input.subject;
    if (input.from) {
      body.from = input.fromName ? { email: input.from, name: input.fromName } : input.from;
    }
    if (input.replyTo) {
      body.reply = input.replyToName
        ? { email: input.replyTo, name: input.replyToName }
        : input.replyTo;
    }
    const props = jsonValue(input.templateProperties);
    if (props !== undefined) body.templateProperties = props;
    if (typeof input.unsubscribeCheck === "boolean") body.unsubscribeCheck = input.unsubscribeCheck;
    if (typeof input.utmTags === "boolean") body.UTMTags = input.utmTags;
    if (input.cc) body.cc = input.cc;
    if (input.bcc) body.bcc = input.bcc;
    return await new EnchargeClient(ctx).request("POST", "/emails/send", { body });
  },
};

export default emailSend;
