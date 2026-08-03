import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, SEND_V31 } from "../lib/client.ts";
import { buildMessage, type SendResponse } from "./send-email.ts";

interface Input {
  from: string;
  to: string;
  templateId: number;
  templateLanguage?: boolean;
  variables?: Record<string, unknown>;
  subject?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  customId?: string;
  sandboxMode?: boolean;
}

/**
 * Send a stored Mailjet template.
 *
 * Two things about this are easy to get wrong and are why it is a separate
 * action rather than a flag on `send-email`:
 *
 *   1. **`TemplateLanguage` must be `true` for `{{var:...}}` to be interpolated.**
 *      Without it Mailjet sends the template with the placeholders left as
 *      literal text — a silent, delivered-looking failure. It defaults to `true`
 *      here, which is the behaviour anyone reaching for a template wants.
 *   2. `Subject` on the message **overrides** the subject stored on the template.
 *      Left blank, the template's own subject is used. It is optional here for
 *      exactly that reason, where on `send-email` it is the only source.
 *
 * `TemplateID` is the numeric ID from `list-templates` (or the template's URL in
 * the Mailjet UI), not the template's name.
 */
const sendTemplateEmail: ActionDefinition<Input> = {
  key: "send-template-email",
  type: "perform",
  /** Retrying delivers the email twice. */
  idempotent: false,
  resource: "email",
  title: "Send Template Email",
  description:
    "Send a stored template via the v3.1 Send API (POST /v3.1/send with `TemplateID`). " +
    "`templateLanguage` defaults to true so `{{var:...}}` placeholders are interpolated. " +
    "Check `Messages[0].Status` — a per-message failure still returns HTTP 200.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "`addr@example.com` or `Name <addr@example.com>`. Must be a validated Mailjet sender.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint:
        "Comma-separated addresses, `Name <addr>` accepted, or a JSON array of `{Email, Name?}`.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "number",
      required: true,
      hint: "Numeric ID from `list-templates` — not the template name.",
    },
    {
      key: "templateLanguage",
      label: "Enable template language",
      type: "boolean",
      default: true,
      hint: "Off means `{{var:...}}` placeholders are delivered as literal text.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "Values for the template's `{{var:name}}` placeholders.",
    },
    {
      key: "subject",
      label: "Subject override",
      type: "string",
      hint: "Leave blank to use the subject stored on the template.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "replyTo", label: "Reply-To", type: "string" },
    { key: "customId", label: "Custom ID", type: "string" },
    {
      key: "sandboxMode",
      label: "Sandbox mode",
      type: "boolean",
      hint: "Validate the payload and return the usual response without delivering anything.",
    },
  ],
  output: [
    {
      key: "Messages",
      type: "array",
      label: "Messages",
    },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    const message = {
      ...buildMessage(input),
      TemplateID: input.templateId,
      TemplateLanguage: input.templateLanguage ?? true,
    };
    const body: Record<string, unknown> = { Messages: [message] };
    if (input.sandboxMode) body.SandboxMode = true;
    return client.request<SendResponse>(SEND_V31, { method: "POST", body });
  },
};

export default sendTemplateEmail;
