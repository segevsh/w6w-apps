import type { ActionDefinition } from "@w6w/types";
import { baseUrl, csv } from "../lib/client.ts";

/**
 * Send a message via `POST /v3/{domain}/messages`.
 * Source: https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-http
 * (form fields cross-checked against n8n's Mailgun node, which posts the same
 * `formData` shape to the same path).
 *
 * Always sent as `multipart/form-data` — Mailgun's HTTP API accepts every
 * field that way, and it is the only encoding that also carries file
 * attachments (`attachment`), so one code path covers both cases.
 */
interface Attachment {
  filename: string;
  /** `data:<mime>;base64,<payload>` or a raw base64 string. */
  content: string;
  contentType?: string;
}

const splitEmails = (s: string | undefined): string[] => csv(s) ?? [];

function decodeAttachment(att: Attachment): { bytes: Uint8Array; contentType: string } {
  const match = att.content.match(/^data:([^;]+);base64,(.*)$/s);
  if (match) {
    return {
      contentType: att.contentType ?? match[1],
      bytes: Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
    };
  }
  return {
    contentType: att.contentType ?? "application/octet-stream",
    bytes: Uint8Array.from(atob(att.content), (c) => c.charCodeAt(0)),
  };
}

function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  const parsed = typeof raw === "string" ? (raw.trim() ? JSON.parse(raw) : []) : raw;
  if (!Array.isArray(parsed)) throw new Error("`attachments` must be a JSON array");
  return parsed.map((a) => {
    const o = a as Record<string, unknown>;
    if (!o.filename || !o.content) {
      throw new Error("each attachment needs `filename` and `content`");
    }
    return {
      filename: String(o.filename),
      content: String(o.content),
      contentType: o.contentType as string | undefined,
    };
  });
}

const action: ActionDefinition = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send a message",
  description: "Send an email through a Mailgun sending domain.",
  idempotent: false,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "mg.example.com",
      hint: "The verified Mailgun sending domain to send through.",
    },
    {
      key: "sender",
      label: "Sender",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        { key: "fromEmail", label: "From Email", type: "string", required: true, default: "" },
        { key: "fromName", label: "From Name", type: "string", default: "" },
      ],
    },
    {
      key: "toEmail",
      label: "To",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated list of recipient email addresses.",
    },
    { key: "subject", label: "Subject", type: "string", required: true, default: "" },
    {
      key: "text",
      label: "Text Body",
      type: "text",
      default: "",
      hint: "Plain-text body. At least one of Text Body / HTML Body is required.",
    },
    { key: "html", label: "HTML Body", type: "text", default: "" },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        { key: "ccEmail", label: "CC", type: "string", default: "", hint: "Comma-separated." },
        { key: "bccEmail", label: "BCC", type: "string", default: "", hint: "Comma-separated." },
        { key: "replyTo", label: "Reply-To", type: "string", default: "" },
        {
          key: "tags",
          label: "Tags",
          type: "string",
          default: "",
          hint: "Comma-separated. Sent as repeated `o:tag`, up to 3 counted for analytics.",
        },
        {
          key: "testMode",
          label: "Test Mode",
          type: "boolean",
          default: false,
          hint: "`o:testmode` — Mailgun accepts but does not deliver.",
        },
        {
          key: "trackingOpens",
          label: "Track Opens",
          type: "boolean",
          hint: "Leave unset to use the domain's default tracking setting.",
        },
        {
          key: "trackingClicks",
          label: "Track Clicks",
          type: "boolean",
          hint: "Leave unset to use the domain's default tracking setting.",
        },
        {
          key: "customHeaders",
          label: "Custom Headers",
          type: "group",
          repeat: true,
          default: [],
          children: [
            {
              key: "name",
              label: "Name",
              type: "string",
              default: "",
              hint: "Sent as `h:<name>`.",
            },
            { key: "value", label: "Value", type: "string", default: "" },
          ],
        },
        {
          key: "attachments",
          label: "Attachments",
          type: "json",
          default: [],
          hint: 'Array of { "filename", "content" (base64 or data URL), "contentType"? }.',
        },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "message", type: "string", label: "Status message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim();
    const fromEmail = String(p.fromEmail ?? "").trim();
    const fromName = String(p.fromName ?? "").trim();
    const toEmail = String(p.toEmail ?? "").trim();
    const subject = String(p.subject ?? "").trim();
    const text = String(p.text ?? "");
    const html = String(p.html ?? "");
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

    if (!domain) throw new Error("`domain` is required");
    if (!fromEmail) throw new Error("`fromEmail` is required");
    if (!toEmail) throw new Error("`toEmail` is required");
    if (!subject) throw new Error("`subject` is required");
    if (!text && !html) throw new Error("one of `text` or `html` is required");

    const form = new FormData();
    form.append("from", fromName ? `${fromName} <${fromEmail}>` : fromEmail);
    for (const to of splitEmails(toEmail)) form.append("to", to);
    for (const cc of splitEmails(additional.ccEmail as string | undefined)) form.append("cc", cc);
    for (const bcc of splitEmails(additional.bccEmail as string | undefined)) {
      form.append("bcc", bcc);
    }
    form.append("subject", subject);
    if (text) form.append("text", text);
    if (html) form.append("html", html);

    if (typeof additional.replyTo === "string" && additional.replyTo.trim()) {
      form.append("h:Reply-To", additional.replyTo.trim());
    }
    for (const tag of splitEmails(additional.tags as string | undefined)) form.append("o:tag", tag);
    if (additional.testMode === true) form.append("o:testmode", "yes");
    if (additional.trackingOpens === true) form.append("o:tracking-opens", "yes");
    if (additional.trackingOpens === false) form.append("o:tracking-opens", "no");
    if (additional.trackingClicks === true) form.append("o:tracking-clicks", "yes");
    if (additional.trackingClicks === false) form.append("o:tracking-clicks", "no");

    const headerRows = additional.customHeaders;
    if (Array.isArray(headerRows)) {
      for (const row of headerRows) {
        const r = row as Record<string, unknown>;
        const name = String(r?.name ?? "").trim();
        if (name && r?.value !== undefined) form.append(`h:${name}`, String(r.value));
      }
    }

    for (const att of parseAttachments(additional.attachments)) {
      const { bytes, contentType } = decodeAttachment(att);
      const arrayBuffer = new Uint8Array(bytes).buffer;
      form.append("attachment", new Blob([arrayBuffer], { type: contentType }), att.filename);
    }

    ctx.log("info", "sending message via Mailgun", { domain, to: toEmail, subject });

    const res = await ctx.fetch(
      `${baseUrl(ctx.connection)}/v3/${encodeURIComponent(domain)}/messages`,
      {
        method: "POST",
        body: form,
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mailgun /v3/${domain}/messages returned ${res.status}: ${errText}`);
    }
    return await res.json();
  },
};

export default action;
