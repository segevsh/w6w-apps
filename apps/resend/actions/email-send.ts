import type { ActionDefinition } from "@w6w/types";
import { addresses, compact, json, ResendClient } from "../lib/client.ts";

/**
 * `POST /emails` — verified against Resend's OpenAPI document (v1.5.0; body
 * requires `from`, `to` and `subject`).
 *
 * **Idempotency.** The endpoint accepts an `Idempotency-Key` header, described
 * by the schema as "a unique identifier for the request to ensure emails are
 * not sent twice". This action defaults it to the invocation id, so a retried
 * step re-sends the *same* email rather than a second one — which is what makes
 * `idempotent: true` honest here rather than a wish.
 */
const action: ActionDefinition = {
  key: "email-send",
  type: "perform",
  resource: "email",
  title: "Send an email",
  description: "Send a transactional email through Resend.",
  // True because of the idempotency key below, not despite the side effect.
  idempotent: true,
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      default: "",
      placeholder: "Acme <hello@example.com>",
      hint: "Must be an address on a verified domain. A friendly name is optional.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated. Resend accepts at most 50 recipients.",
    },
    { key: "subject", label: "Subject", type: "string", required: true, default: "" },
    { key: "html", label: "HTML Body", type: "text", default: "" },
    { key: "text", label: "Plain Text Body", type: "text", default: "" },
    { key: "cc", label: "Cc", type: "string", default: "", hint: "Comma-separated." },
    { key: "bcc", label: "Bcc", type: "string", default: "", hint: "Comma-separated." },
    { key: "replyTo", label: "Reply-To", type: "string", default: "", hint: "Comma-separated." },
    {
      key: "scheduledAt",
      label: "Send At",
      type: "string",
      default: "",
      placeholder: "in 1 hour",
      hint: "An ISO 8601 timestamp, or Resend's natural-language form like `in 1 hour`.",
    },
    {
      key: "headers",
      label: "Custom Headers",
      type: "json",
      default: "",
      placeholder: '{"X-Entity-Ref-ID": "123"}',
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      default: "",
      placeholder: '[{"filename":"invoice.pdf","path":"https://example.com/invoice.pdf"}]',
      hint: "Each attachment takes `filename` plus either `path` (a URL) or `content` (base64).",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      placeholder: '[{"name":"category","value":"welcome"}]',
    },
    {
      key: "idempotencyKey",
      label: "Idempotency Key",
      type: "string",
      default: "",
      hint: "Leave blank to use this step's invocation id, which makes a retry safe.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Email ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = String(p.from ?? "").trim();
    const subject = String(p.subject ?? "").trim();
    const to = addresses(p.to, "to", 50);
    if (!from) throw new Error("`from` is required");
    if (!to) throw new Error("`to` is required");
    if (!subject) throw new Error("`subject` is required");
    if (!p.html && !p.text) {
      // Resend rejects a body-less email; saying so here names both options.
      throw new Error("set `html`, `text`, or both — an email needs a body");
    }

    const body = compact({
      from,
      to,
      subject,
      html: p.html,
      text: p.text,
      cc: addresses(p.cc, "cc"),
      bcc: addresses(p.bcc, "bcc"),
      reply_to: addresses(p.replyTo, "replyTo"),
      scheduled_at: p.scheduledAt,
      headers: json(p.headers, "headers"),
      attachments: json(p.attachments, "attachments"),
      tags: json(p.tags, "tags"),
    });

    // The invocation id is the natural idempotency key: stable across retries
    // of the same step, different for the next one.
    const idempotencyKey = String(p.idempotencyKey ?? "").trim() ||
      ctx.invocation?.invocationId;

    ctx.log("info", "sending email via Resend", { to, subject });

    return await new ResendClient(ctx).request("/emails", {
      method: "POST",
      body,
      idempotencyKey,
    });
  },
};

export default action;
