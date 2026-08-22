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
      key: "sendOptions",
      label: "Additional options",
      // Was a `type: "group"`, which ParamsForm renders as a raw JSON editor —
      // so CC, BCC, Reply-To and every option below were unreachable as form
      // fields. A section is layout-only: the children render as real inputs
      // and their values arrive flat. Same defect and same fix as SendGrid's
      // `mail-send`.
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "CC/BCC, reply-to, attachments, headers, scheduling, tracking",
      collapsed: true,
      children: [
        {
          key: "copies",
          label: "Copies",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            { key: "ccEmail", label: "CC", type: "string", default: "", hint: "Comma-separated." },
            {
              key: "bccEmail",
              label: "BCC",
              type: "string",
              default: "",
              hint: "Comma-separated.",
            },
          ],
        },
        { key: "replyTo", label: "Reply-To", type: "string", default: "" },
        {
          key: "attachments",
          label: "Attachments",
          type: "json",
          default: [],
          hint: 'Array of { "filename", "content" (base64 or data URL), "contentType"? }.',
        },
        {
          key: "customHeaders",
          label: "Custom Headers",
          // Was a `repeat: true` group — a JSON editor for what is a two-column
          // list. An `array` of object items is the control that renders.
          type: "array",
          default: [],
          item: {
            type: "object",
            fields: [
              { key: "name", label: "Name", type: "string", placeholder: "X-Campaign" },
              { key: "value", label: "Value", type: "string", placeholder: "spring" },
            ],
          },
          hint: "Each row is sent as `h:<name>`.",
        },
        {
          key: "customVariables",
          label: "Custom Variables",
          type: "json",
          default: {},
          hint:
            'Sent as `v:<name>` and echoed back on this message\'s webhook events, e.g. { "orderId": "42" }.',
        },
        {
          key: "tags",
          label: "Tags",
          type: "string",
          default: "",
          hint: "Comma-separated. Sent as repeated `o:tag`, up to 3 counted for analytics.",
        },
        {
          key: "deliveryTime",
          label: "Delivery Time",
          type: "datetime",
          hint:
            "Schedule delivery (`o:deliverytime`). Mailgun accepts up to 3 days ahead on paid plans.",
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
          key: "testMode",
          label: "Test Mode",
          type: "boolean",
          default: false,
          hint: "`o:testmode` — Mailgun accepts but does not deliver.",
        },
      ],
    },
    {
      key: "additionalFields",
      // DEPRECATED — kept declared so steps saved against the old group shape
      // keep working; `resolveParams` drops any key an action does not declare,
      // so removing it outright would silently strip those saved values. The
      // flat fields above win; see `pick()` in `execute`.
      label: "Additional Fields (deprecated)",
      type: "json",
      default: {},
      advanced: true,
      hint: "Superseded by the fields above and kept only so older saved steps keep working. " +
        "Anything set here is used only when the matching field above is empty.",
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
    /**
     * Read a flat param, falling back to the same key inside the deprecated
     * `additionalFields` group. A declared default of `[]`/`{}` counts as blank
     * so an untouched field defers to the fallback rather than shadowing it.
     */
    const pick = (key: string): unknown => {
      const v = p[key];
      const blank = v === undefined || v === null || v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === "object" && !Array.isArray(v) &&
          Object.keys(v as Record<string, unknown>).length === 0);
      return blank ? additional[key] : v;
    };

    if (!domain) throw new Error("`domain` is required");
    if (!fromEmail) throw new Error("`fromEmail` is required");
    if (!toEmail) throw new Error("`toEmail` is required");
    if (!subject) throw new Error("`subject` is required");
    if (!text && !html) throw new Error("one of `text` or `html` is required");

    const form = new FormData();
    form.append("from", fromName ? `${fromName} <${fromEmail}>` : fromEmail);
    for (const to of splitEmails(toEmail)) form.append("to", to);
    for (const cc of splitEmails(pick("ccEmail") as string | undefined)) form.append("cc", cc);
    for (const bcc of splitEmails(pick("bccEmail") as string | undefined)) {
      form.append("bcc", bcc);
    }
    form.append("subject", subject);
    if (text) form.append("text", text);
    if (html) form.append("html", html);

    const replyTo = pick("replyTo");
    if (typeof replyTo === "string" && replyTo.trim()) {
      form.append("h:Reply-To", replyTo.trim());
    }
    for (const tag of splitEmails(pick("tags") as string | undefined)) form.append("o:tag", tag);
    if (pick("testMode") === true) form.append("o:testmode", "yes");
    const trackingOpens = pick("trackingOpens");
    if (trackingOpens === true) form.append("o:tracking-opens", "yes");
    if (trackingOpens === false) form.append("o:tracking-opens", "no");
    const trackingClicks = pick("trackingClicks");
    if (trackingClicks === true) form.append("o:tracking-clicks", "yes");
    if (trackingClicks === false) form.append("o:tracking-clicks", "no");

    // `o:deliverytime` is RFC 2822, not ISO 8601 — Mailgun rejects the latter.
    const deliveryTime = pick("deliveryTime");
    if (typeof deliveryTime === "string" && deliveryTime.trim()) {
      const at = new Date(deliveryTime);
      if (Number.isNaN(at.getTime())) {
        throw new Error(`\`deliveryTime\` is not a valid date: "${deliveryTime}"`);
      }
      form.append("o:deliverytime", at.toUTCString());
    }

    const customVariables = pick("customVariables");
    if (customVariables && typeof customVariables === "object" && !Array.isArray(customVariables)) {
      for (const [k, v] of Object.entries(customVariables as Record<string, unknown>)) {
        if (v === undefined || v === null) continue;
        form.append(`v:${k}`, typeof v === "string" ? v : JSON.stringify(v));
      }
    }

    const headerRows = pick("customHeaders");
    if (Array.isArray(headerRows)) {
      for (const row of headerRows) {
        const r = row as Record<string, unknown>;
        const name = String(r?.name ?? "").trim();
        if (name && r?.value !== undefined) form.append(`h:${name}`, String(r.value));
      }
    }

    for (const att of parseAttachments(pick("attachments"))) {
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
