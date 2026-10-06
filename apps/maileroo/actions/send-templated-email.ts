import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";
import { asObject, commonBody, type CommonInput, P } from "../lib/mail.ts";

interface Input extends CommonInput {
  templateId: number;
  templateData?: unknown;
}

/** `POST /api/v2/emails/template` — an email rendered from a dashboard template. */
const sendTemplatedEmail: ActionDefinition<Input> = {
  key: "send-templated-email",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Send Templated Email",
  description: "Send an email rendered from a Maileroo template with per-send template data. " +
    "Needs the connection's Sending Key. Find template IDs with List Templates.",
  params: [
    ...P.FROM,
    ...P.RECIPIENTS,
    {
      ...P.SUBJECT,
      hint: "Supports template variables, e.g. `Welcome {{ first_name }}`.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "templateData",
      label: "Template data",
      type: "json",
      hint:
        'Object mapping template variables to values (nesting allowed), e.g. {"first_name":"Jane"}.',
    },
    P.TRACKING,
    P.TAGS,
    P.HEADERS,
    P.ATTACHMENTS,
    P.SCHEDULED,
    P.REF,
  ],
  output: [
    { key: "referenceId", type: "string", label: "Reference ID of the queued email" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const templateId = Number(input.templateId);
    if (!Number.isInteger(templateId) || templateId < 1) {
      throw new Error("templateId must be a positive integer");
    }
    const body = {
      ...commonBody(input),
      template_id: templateId,
      ...(asObject(input.templateData, "templateData")
        ? { template_data: asObject(input.templateData, "templateData") }
        : {}),
    };
    const { data, body: raw } = await new MailerooClient(ctx).send("/emails/template", { body });
    return {
      referenceId: (data as { reference_id?: string } | undefined)?.reference_id,
      message: (raw as { message?: string } | undefined)?.message,
    };
  },
};

export default sendTemplatedEmail;
