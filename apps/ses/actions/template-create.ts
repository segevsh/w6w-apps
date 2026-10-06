import type { ActionDefinition } from "@w6w/types";
import { ses } from "../lib/api.ts";

/**
 * CreateEmailTemplate — `POST /v2/email/templates`. A name that already exists is a 400
 * `AlreadyExistsException`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_CreateEmailTemplate.html
 */
interface Input {
  templateName: string;
  subject: string;
  html?: string;
  text?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a stored email template with {{placeholder}} substitution.",
  idempotent: false,
  params: [
    { key: "templateName", label: "Template name", type: "string", required: true },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      hint: "May contain {{placeholders}}.",
    },
    { key: "html", label: "HTML body", type: "text" },
    { key: "text", label: "Text body", type: "text" },
  ],
  output: [
    { key: "templateName", type: "string", label: "Template name" },
    { key: "created", type: "boolean", label: "True when SES accepted the template" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "CreateEmailTemplate",
      method: "POST",
      path: "/v2/email/templates",
      body: {
        TemplateName: input.templateName,
        TemplateContent: { Subject: input.subject, Html: input.html, Text: input.text },
      },
    });
    return { templateName: input.templateName, created: true };
  },
};

export default action;
