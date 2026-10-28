import type { ActionDefinition } from "@w6w/types";

/**
 * SendGrid v3 `/mail/send`. Two mutually exclusive body modes:
 *   - inline  — `content: [{ type, value }]` with the typed subject/body;
 *   - dynamic — `template_id` + `personalizations[].dynamic_template_data`,
 *     where SendGrid renders the stored template's handlebars.
 *
 * FORM SHAPE — this action was originally transcribed from n8n's SendGrid node,
 * which buries every optional field in one `additionalFields` collection. w6w
 * renders a `type: "group"` param as a raw JSON editor (ParamsForm.tsx), so that
 * shape made CC, BCC, Reply-To and friends *invisible as fields* — the exact
 * "SendGrid can't CC" report. They now sit in a `section: "collapsible"` —
 * layout-only, so the children render as real inputs and their values stay
 * flat — behind one disclosure, rather than lengthening the compose form.
 * `additionalFields` survives only as a
 * deprecated JSON escape hatch so steps saved against the old shape keep
 * working; `pick()` below reads flat first and falls back to it.
 */

/**
 * True when a param value carries nothing the caller meant to send: unset, an
 * empty string, an empty list, or an empty object. Declared defaults are `[]` /
 * `{}`, so without this a defaulted-but-untouched field would shadow the
 * deprecated `additionalFields` fallback instead of deferring to it.
 */
function isBlank(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

/** A record whose values came from the old `additionalFields` group. */
type Legacy = Record<string, unknown>;

/**
 * Normalize the "Dynamic Template Fields" value into SendGrid's
 * `dynamic_template_data` object.
 *
 * Accepts the plain object the JSON editor produces (`{ first_name: "James" }`)
 * and, for compatibility with the n8n-shaped fixed-collection form, a
 * `{ key, value }` pair list under `fields` (or a bare array of such pairs).
 */
function toTemplateData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  const pairs = (list: unknown[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const entry of list) {
      const e = entry as { key?: unknown; value?: unknown };
      const key = String(e?.key ?? "").trim();
      if (key) out[key] = e.value;
    }
    return out;
  };
  if (Array.isArray(raw)) return pairs(raw);
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return {};
    try {
      return toTemplateData(JSON.parse(text));
    } catch {
      throw new Error("`dynamicTemplateFields` is not valid JSON.");
    }
  }
  if (typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.fields)) return pairs(obj.fields);
  // Already a variable -> value map.
  return obj;
}

/**
 * Parse a param that may arrive as an object (the JSON editor's own value) or
 * as the JSON text a caller typed. Anything else yields `undefined` so the
 * caller can simply omit the field.
 */
function toObject(raw: unknown, key: string): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "string") {
    try {
      return toObject(JSON.parse(raw), key);
    } catch {
      throw new Error(`\`${key}\` is not valid JSON.`);
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  return Object.keys(obj).length ? obj : undefined;
}

/** SendGrid takes every header value as a string. */
function toStringMap(raw: unknown, key: string): Record<string, string> | undefined {
  const obj = toObject(raw, key);
  if (!obj) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/** One `attachments[]` entry, dropping rows the user left blank. */
interface Attachment {
  content: string;
  filename: string;
  type?: string;
  disposition?: string;
  content_id?: string;
}

function toAttachments(raw: unknown): Attachment[] | undefined {
  if (!raw) return undefined;
  const list = typeof raw === "string"
    ? (() => {
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error("`attachments` is not valid JSON.");
      }
    })()
    : raw;
  if (!Array.isArray(list)) return undefined;
  const out: Attachment[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const content = String(e.content ?? "").trim();
    const filename = String(e.filename ?? "").trim();
    // SendGrid requires both on every attachment — a half-filled row is a
    // 400 waiting to happen, so skip it rather than send it.
    if (!content || !filename) continue;
    const att: Attachment = { content, filename };
    if (e.type) att.type = String(e.type);
    if (e.disposition) att.disposition = String(e.disposition);
    if (e.contentId) att.content_id = String(e.contentId);
    out.push(att);
  }
  return out.length ? out : undefined;
}

const action: ActionDefinition = {
  key: "mail-send",
  type: "perform",
  resource: "mail",
  title: "Send an email",
  description: "Send an email",
  params: [
    {
      key: "sender",
      label: "Sender",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        {
          key: "fromEmail",
          label: "Sender Email",
          type: "string",
          required: true,
          default: "",
          hint: "Email address of the sender of the email",
        },
        {
          key: "fromName",
          label: "Sender Name",
          type: "string",
          default: "",
          hint: "Name of the sender of the email",
        },
      ],
    },
    {
      key: "toEmail",
      label: "Recipient Email",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated list of recipient email addresses",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      default: "",
      hint: "Subject of the email to send",
    },
    {
      key: "contentValue",
      label: "Message Body",
      type: "text",
      config: { multiline: true },
      // Genuinely optional: SendGrid's API doesn't require non-empty content,
      // only the `content` array's presence (handled unconditionally in
      // `execute` below) — a blank body sends a subject-only email.
      default: "",
      showIf: { field: "dynamicTemplate", truthy: false },
      hint: "Message body of the email to send",
    },
    {
      key: "dynamicTemplate",
      label: "Dynamic Template",
      type: "boolean",
      required: true,
      default: false,
      hint: "Whether this email will contain a dynamic template",
    },
    {
      key: "templateId",
      label: "Dynamic Template ID",
      type: "string",
      // Required only when the email uses a dynamic template — see the
      // `contentValue` param above for why `required` + `showIf` is safe now.
      required: true,
      default: "",
      placeholder: "d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      // Only relevant when the email uses a dynamic template — hide otherwise.
      showIf: { field: "dynamicTemplate", truthy: true },
      hint:
        "ID of the SendGrid dynamic template (starts with `d-`, from Email API → Dynamic Templates). " +
        "Handlebars like {{ first_name }} are rendered by SendGrid from the STORED template only — " +
        "the Subject/Message Body typed above are not templated.",
    },
    {
      key: "dynamicTemplateFields",
      label: "Dynamic Template Fields",
      // Rendered as a JSON editor: an object of template variable -> value,
      // sent verbatim as `personalizations[0].dynamic_template_data`.
      type: "json",
      default: {},
      // Only relevant when the email uses a dynamic template — hide otherwise.
      showIf: { field: "dynamicTemplate", truthy: true },
      hint: 'Values for the template variables, e.g. { "first_name": "James" }',
    },
    {
      key: "deliveryOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "CC/BCC, reply-to, attachments, headers, scheduling, tracking",
      collapsed: true,
      children: [
        // CC/BCC lead the section: they are the most-reached-for options here,
        // but they are still options — the compose path is From/To/Subject/Body,
        // and putting every optional field on it is what this section is for.
        {
          key: "copies",
          label: "Copies",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            {
              key: "ccEmail",
              label: "CC",
              type: "string",
              default: "",
              hint: "Comma-separated list of carbon-copy recipients",
            },
            {
              key: "bccEmail",
              label: "BCC",
              type: "string",
              default: "",
              hint: "Comma-separated list of blind-carbon-copy recipients",
            },
          ],
        },
        {
          key: "replyTo",
          label: "Reply-To",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            {
              key: "replyToEmail",
              label: "Reply-To Email",
              type: "string",
              default: "",
              hint: "Address replies are directed to",
            },
            {
              key: "replyToName",
              label: "Reply-To Name",
              type: "string",
              default: "",
              hint: "Display name shown beside the reply-to address",
            },
          ],
        },
        {
          key: "attachments",
          label: "Attachments",
          type: "array",
          default: [],
          item: {
            type: "object",
            fields: [
              { key: "filename", label: "File name", type: "string", placeholder: "report.pdf" },
              { key: "content", label: "Base64 content", type: "string", placeholder: "base64…" },
              { key: "type", label: "MIME type", type: "string", placeholder: "application/pdf" },
              {
                key: "disposition",
                label: "Disposition",
                type: "select",
                default: "attachment",
                options: [
                  { value: "attachment", label: "Attachment" },
                  { value: "inline", label: "Inline" },
                ],
              },
              { key: "contentId", label: "Content ID", type: "string", placeholder: "logo" },
            ],
          },
          hint:
            "SendGrid takes attachment bytes base64-encoded. File name and content are both required; " +
            "rows missing either are skipped. Use `inline` + a Content ID to embed an image in HTML.",
        },
        {
          key: "headers",
          label: "Custom Headers",
          type: "json",
          default: {},
          hint:
            'Extra SMTP headers, e.g. { "X-Campaign": "spring" }. Reserved headers are rejected by SendGrid.',
        },
        {
          key: "categories",
          label: "Categories",
          type: "string",
          default: "",
          hint:
            "Comma-separated list of categories. Each category name may not exceed 255 characters.",
        },
        {
          key: "customArgs",
          label: "Custom Args",
          type: "json",
          default: {},
          hint:
            'Key/value pairs echoed back on every event webhook for this message, e.g. { "orderId": "42" }',
        },
        {
          key: "sendAt",
          label: "Send At",
          type: "datetime",
          default: "",
          hint: "When to deliver the email. Scheduling more than 72 hours in advance is forbidden.",
        },
        {
          key: "batchId",
          label: "Batch ID",
          type: "string",
          default: "",
          hint: "Groups this message into a batch that can be cancelled or rescheduled as a unit",
        },
        {
          key: "asmGroupId",
          label: "Unsubscribe Group ID",
          type: "number",
          hint: "Numeric ASM group id, so the message honours that group's unsubscribe preferences",
        },
        {
          key: "ipPoolName",
          label: "IP Pool Name",
          type: "string",
          default: "",
          hint: "The IP Pool that you would like to send this email from",
        },
        {
          key: "trackOpens",
          label: "Track Opens",
          type: "boolean",
          hint: "Override the account default for open tracking on this message",
        },
        {
          key: "trackClicks",
          label: "Track Clicks",
          type: "boolean",
          hint: "Override the account default for click tracking on this message",
        },
        {
          key: "enableSandbox",
          label: "Enable Sandbox",
          type: "boolean",
          default: false,
          hint: "Whether to use to the sandbox for testing out email-sending functionality",
        },
      ],
    },
    {
      key: "advancedContent",
      label: "Advanced",
      type: "section",
      section: "collapsible",
      title: "Advanced",
      subtitle: "MIME type & template",
      collapsed: true,
      children: [
        {
          key: "contentType",
          label: "MIME Type",
          type: "select",
          default: "text/plain",
          hint: "MIME type of the email to send",
          options: [
            { "value": "text/plain", "label": "Plain Text" },
            { "value": "text/html", "label": "HTML" },
          ],
        },
      ],
    },
    {
      key: "additionalFields",
      // DEPRECATED — kept declared so steps saved against the pre-flattening
      // shape keep sending CC/BCC/etc. `resolveParams` drops any key an action
      // does not declare, so removing this outright would silently strip those
      // saved values. Flat fields above win; see `pick()`.
      label: "Additional Fields (deprecated)",
      type: "json",
      default: {},
      advanced: true,
      hint: "Superseded by the fields above and kept only so older saved steps keep working. " +
        "Anything set here is used only when the matching field above is empty.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const legacy = (p.additionalFields ?? {}) as Legacy;

    /**
     * Read a flat param, falling back to the same key inside the deprecated
     * `additionalFields` group. Two former keys were renamed on the way out
     * (`replyToEmail` kept its name; nothing else moved), so the group's own
     * key is the same string in every case.
     */
    const pick = (key: string): unknown => {
      const flat = p[key];
      return isBlank(flat) ? legacy[key] : flat;
    };

    const fromEmail = String(p.fromEmail ?? "").trim();
    const toEmailRaw = String(p.toEmail ?? "").trim();
    const subject = String(p.subject ?? "").trim();
    const contentValue = String(p.contentValue ?? "");
    const contentType = String(p.contentType ?? "text/plain");

    if (!fromEmail) throw new Error("`fromEmail` is required");
    if (!toEmailRaw) throw new Error("`toEmail` is required");
    if (!subject) throw new Error("`subject` is required");
    // `contentValue` is required only when no dynamic template supplies the body
    // (checked after `useTemplate` is resolved, below).

    const splitEmails = (s: unknown): { email: string }[] =>
      String(s ?? "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ email }));

    const personalization: Record<string, unknown> = { to: splitEmails(toEmailRaw) };
    const cc = splitEmails(pick("ccEmail"));
    const bcc = splitEmails(pick("bccEmail"));
    if (cc.length) personalization.cc = cc;
    if (bcc.length) personalization.bcc = bcc;

    // Dynamic templates. SendGrid renders handlebars ({{ first_name }}) ONLY
    // inside a stored dynamic template addressed by `template_id` — never in the
    // inline `subject`/`content` of the request. So the substitution values go to
    // `personalizations[].dynamic_template_data` and the inline content is
    // dropped (the template supplies the body).
    const useTemplate = p.dynamicTemplate === true;
    const templateId = String(p.templateId ?? "").trim();
    if (useTemplate && !templateId) {
      throw new Error(
        'Dynamic Template is enabled but no "Dynamic Template ID" is set. SendGrid renders ' +
          "{{ variables }} from a stored dynamic template (id starts with `d-`), not from the " +
          "Subject/Message Body typed here — set the template ID, or turn Dynamic Template off.",
      );
    }
    // No inline-body requirement: SendGrid's API only requires the `content`
    // array to be present (structurally) when not using a template — the
    // `value` string itself has no documented non-empty constraint, so an
    // empty Message Body sends fine (a subject-only email). Left to SendGrid's
    // own validation rather than pre-emptively blocked here.
    const dynamicData = useTemplate ? toTemplateData(p.dynamicTemplateFields) : undefined;
    if (dynamicData && Object.keys(dynamicData).length) {
      personalization.dynamic_template_data = dynamicData;
    }

    const body: Record<string, unknown> = {
      personalizations: [personalization],
      from: {
        email: fromEmail,
        ...(p.fromName ? { name: String(p.fromName) } : {}),
      },
      // The template's own subject wins when it defines one; ours is the fallback.
      subject,
      ...(useTemplate
        ? { template_id: templateId }
        : { content: [{ type: contentType, value: contentValue }] }),
    };

    const replyToEmail = pick("replyToEmail");
    if (replyToEmail) {
      const replyToName = pick("replyToName");
      body.reply_to = {
        email: String(replyToEmail),
        ...(replyToName ? { name: String(replyToName) } : {}),
      };
    }
    const categories = pick("categories");
    if (typeof categories === "string" && categories.length) {
      body.categories = categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
    const headers = toStringMap(pick("headers"), "headers");
    if (headers) body.headers = headers;

    const customArgs = toStringMap(pick("customArgs"), "customArgs");
    if (customArgs) body.custom_args = customArgs;

    const attachments = toAttachments(pick("attachments"));
    if (attachments) body.attachments = attachments;

    const batchId = pick("batchId");
    if (typeof batchId === "string" && batchId.length) body.batch_id = batchId;

    const asmGroupId = pick("asmGroupId");
    if (asmGroupId !== undefined && asmGroupId !== null && asmGroupId !== "") {
      const groupId = Number(asmGroupId);
      if (Number.isFinite(groupId)) body.asm = { group_id: groupId };
    }

    // `mail_settings` and `tracking_settings` are both objects SendGrid merges
    // over the account defaults — only send the keys the user actually set, so
    // an untouched toggle keeps inheriting the account setting.
    if (pick("enableSandbox") === true) {
      body.mail_settings = { sandbox_mode: { enable: true } };
    }
    const tracking: Record<string, unknown> = {};
    const trackOpens = pick("trackOpens");
    if (typeof trackOpens === "boolean") tracking.open_tracking = { enable: trackOpens };
    const trackClicks = pick("trackClicks");
    if (typeof trackClicks === "boolean") tracking.click_tracking = { enable: trackClicks };
    if (Object.keys(tracking).length) body.tracking_settings = tracking;

    const ipPoolName = pick("ipPoolName");
    if (typeof ipPoolName === "string" && ipPoolName.length) body.ip_pool_name = ipPoolName;

    const sendAt = pick("sendAt");
    if (typeof sendAt === "string" && sendAt.length) {
      const ts = Math.floor(new Date(sendAt).getTime() / 1000);
      if (Number.isFinite(ts)) body.send_at = ts;
    }

    ctx.log("info", "sending email via SendGrid", {
      from: fromEmail,
      to: toEmailRaw,
      subject,
      ...(cc.length ? { cc: cc.length } : {}),
      ...(bcc.length ? { bcc: bcc.length } : {}),
      ...(useTemplate ? { templateId } : {}),
    });

    const res = await ctx.fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/mail/send returned ${res.status}: ${errText}`);
    }

    // SendGrid acks with 202 + empty body; the X-Message-Id header is the receipt.
    return {
      accepted: true,
      statusCode: res.status,
      messageId: res.headers.get("x-message-id") ?? undefined,
    };
  },
};

export default action;
