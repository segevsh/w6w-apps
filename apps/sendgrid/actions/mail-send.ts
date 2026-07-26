import type { ActionDefinition } from "@w6w/types";

/**
 * Generated from n8n: mail:send
 * Source: https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/SendGrid
 *
 * Posts to SendGrid's v3 `/mail/send`. Two mutually exclusive body modes:
 *   - inline  — `content: [{ type, value }]` with the typed subject/body;
 *   - dynamic — `template_id` + `personalizations[].dynamic_template_data`,
 *     where SendGrid renders the stored template's handlebars.
 */
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
      // Required only when NOT using a dynamic template (the template supplies
      // the body) — enforced in `execute`, since `required` is static.
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
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "attachments",
          label: "Attachments",
          type: "string",
          default: "",
          hint: "Comma-separated list of binary properties",
        },
        {
          key: "bccEmail",
          label: "BCC Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of emails of the recipients of a blind carbon copy of the email",
        },
        {
          key: "categories",
          label: "Categories",
          type: "string",
          default: "",
          hint: "Comma-separated list of categories. Each category name may not exceed 255 characters.",
        },
        {
          key: "ccEmail",
          label: "CC Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of emails of the recipients of a carbon copy of the email",
        },
        {
          key: "enableSandbox",
          label: "Enable Sandbox",
          type: "boolean",
          default: false,
          hint: "Whether to use to the sandbox for testing out email-sending functionality",
        },
        {
          key: "ipPoolName",
          label: "IP Pool Name",
          type: "string",
          default: "",
          hint: "The IP Pool that you would like to send this email from",
        },
        {
          key: "replyToEmail",
          label: "Reply-To Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of email addresses that will appear in the reply-to field of the email",
        },
        {
          key: "headers",
          label: "Headers",
          type: "group",
          default: {},
          children: [
            {
              key: "key",
              label: "Key",
              type: "string",
              default: "",
              hint: "Key to set in the header object",
            },
            {
              key: "value",
              label: "Value",
              type: "string",
              default: "",
              hint: "Value to set in the header object",
            },
          ],
        },
        {
          key: "sendAt",
          label: "Send At",
          type: "datetime",
          default: "",
          hint: "When to deliver the email. Scheduling more than 72 hours in advance is forbidden.",
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
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

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
    const cc = splitEmails(additional.ccEmail);
    const bcc = splitEmails(additional.bccEmail);
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
    if (!useTemplate && !contentValue) throw new Error("`contentValue` is required");
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

    if (additional.replyToEmail) {
      body.reply_to = { email: String(additional.replyToEmail) };
    }
    if (typeof additional.categories === "string" && additional.categories.length) {
      body.categories = additional.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
    if (additional.enableSandbox === true) {
      body.mail_settings = { sandbox_mode: { enable: true } };
    }
    if (typeof additional.ipPoolName === "string" && additional.ipPoolName.length) {
      body.ip_pool_name = additional.ipPoolName;
    }
    if (typeof additional.sendAt === "string" && additional.sendAt.length) {
      const ts = Math.floor(new Date(additional.sendAt).getTime() / 1000);
      if (Number.isFinite(ts)) body.send_at = ts;
    }

    ctx.log("info", "sending email via SendGrid", {
      from: fromEmail,
      to: toEmailRaw,
      subject,
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
