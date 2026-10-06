import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, toList, toRecipients } from "../lib/client.ts";

interface Input {
  fromEmail?: string;
  fromName?: string;
  to: unknown;
  cc?: unknown;
  bcc?: unknown;
  replyToEmail?: string;
  replyToName?: string;
  subject?: string;
  text?: string;
  html?: string;
  templateId?: string;
  language?: string;
  tags?: unknown;
  personalization?: unknown;
  precedenceBulk?: boolean;
  sendAt?: string | number;
  inReplyTo?: string;
  references?: unknown;
  settings?: Record<string, boolean>;
  attachments?: unknown;
  headers?: unknown;
  listUnsubscribe?: string;
}

const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  resource: "email",
  title: "Send Email",
  description:
    "Send one transactional email (POST /v1/email). The call is asynchronous: a 202 means queued, and the `x-message-id` header is returned as `messageId`. Provide `html`, `text` or `templateId`. When every recipient is suppressed nothing is sent and `messageId` is null.",
  // MailerSend documents no idempotency key: a retried call sends a second email.
  idempotent: false,
  params: [
    {
      key: "fromEmail",
      label: "From email",
      type: "string",
      hint:
        "Must be on a verified domain or a verified sender identity. Optional only when `templateId` has a default sender.",
    },
    { key: "fromName", label: "From name", type: "string" },
    {
      key: "to",
      label: "To",
      type: "json",
      required: true,
      hint:
        'Up to 50 recipients (10 on an unapproved account): `[{"email":"a@x.com","name":"A"}]`, or just `["a@x.com"]`, or a comma-separated string.',
    },
    { key: "cc", label: "Cc", type: "json", hint: "Up to 10. Same shape as To." },
    { key: "bcc", label: "Bcc", type: "json", hint: "Up to 10. Same shape as To." },
    { key: "replyToEmail", label: "Reply-to email", type: "string" },
    { key: "replyToName", label: "Reply-to name", type: "string" },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Max 998 characters. Optional only when `templateId` has a default subject.",
    },
    { key: "html", label: "HTML body", type: "code", hint: "Max 2 MB." },
    { key: "text", label: "Plain-text body", type: "text", hint: "Max 2 MB." },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Use instead of `html`/`text`. See List Templates.",
    },
    {
      key: "language",
      label: "Template language",
      type: "select",
      options: ["de", "en", "es", "fr", "it", "lt", "nl", "pl", "pt-BR"].map((v) => ({
        value: v,
        label: v,
      })),
      hint: "Only applied with `templateId`; falls back to the base template when no translation.",
    },
    { key: "tags", label: "Tags", type: "json", hint: "Up to 5, each up to 191 characters." },
    {
      key: "personalization",
      label: "Personalization",
      type: "json",
      hint:
        'Per-recipient `{{var}}` data: `[{"email":"a@x.com","data":{"company":"Acme"}}]`. Every email must also be in To.',
    },
    {
      key: "precedenceBulk",
      label: "Precedence: bulk",
      type: "boolean",
      hint: "Overrides the domain's advanced setting.",
    },
    {
      key: "sendAt",
      label: "Send at",
      type: "string",
      hint:
        "Schedule: a Unix timestamp or ISO 8601 date, at most 72 hours ahead. Returns a message id you can read with Get Scheduled Message.",
    },
    { key: "inReplyTo", label: "In-Reply-To", type: "string", hint: "Paid plans only." },
    { key: "references", label: "References", type: "json", hint: "Message-IDs, paid plans only." },
    {
      key: "settings",
      label: "Tracking settings",
      type: "json",
      hint: '`{"track_clicks":true,"track_opens":true,"track_content":false}` — only those keys.',
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint:
        '`[{"filename":"a.pdf","content":"<base64>","disposition":"attachment"}]`. Up to 25 MB each; `id` makes an inline CID.',
    },
    {
      key: "headers",
      label: "Custom headers",
      type: "json",
      hint: '`[{"name":"X-Foo","value":"bar"}]`. Professional and Enterprise plans only.',
    },
    {
      key: "listUnsubscribe",
      label: "List-Unsubscribe",
      type: "string",
      hint: "RFC 8058 value, max 990 characters. Professional and Enterprise plans only.",
    },
  ],
  output: [
    { key: "accepted", type: "boolean", label: "True when the API answered 202" },
    {
      key: "messageId",
      type: "string",
      label: "x-message-id header — null when every recipient was suppressed",
    },
    { key: "paused", type: "boolean", label: "True when the domain's sending is paused" },
    { key: "warnings", type: "array", label: "Suppression warnings the API returned, if any" },
  ],

  async execute(input, ctx) {
    const body = compact({
      from: input.fromEmail ? compact({ email: input.fromEmail, name: input.fromName }) : undefined,
      to: toRecipients(input.to),
      cc: toRecipients(input.cc),
      bcc: toRecipients(input.bcc),
      reply_to: input.replyToEmail
        ? compact({ email: input.replyToEmail, name: input.replyToName })
        : undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
      template_id: input.templateId,
      language: input.language,
      tags: toList(input.tags),
      personalization: input.personalization,
      precedence_bulk: input.precedenceBulk,
      send_at: input.sendAt,
      in_reply_to: input.inReplyTo,
      references: toList(input.references),
      settings: input.settings,
      attachments: input.attachments,
      headers: input.headers,
      list_unsubscribe: input.listUnsubscribe,
    });
    const res = await new MailerSendClient(ctx).request<{ warnings?: unknown[] }>("/email", {
      method: "POST",
      body,
    });
    return {
      accepted: true,
      messageId: res.headers.get("x-message-id"),
      paused: res.headers.get("x-send-paused") === "true",
      warnings: res.body?.warnings ?? [],
    };
  },
};

export default sendEmail;
