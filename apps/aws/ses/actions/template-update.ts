import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * UpdateEmailTemplate — `PUT /v2/email/templates/{TemplateName}`. The content REPLACES the stored
 * one, so omitting `html` or `text` clears it.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_UpdateEmailTemplate.html
 */
interface Input {
  templateName: string;
  subject: string;
  html?: string;
  text?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "template-update",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description: "Replace the subject and bodies of an existing template.",
  idempotent: true,
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
    { key: "updated", type: "boolean", label: "True when SES accepted the update" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "UpdateEmailTemplate",
      method: "PUT",
      path: `/v2/email/templates/${seg(input.templateName)}`,
      body: { TemplateContent: { Subject: input.subject, Html: input.html, Text: input.text } },
    });
    return { templateName: input.templateName, updated: true };
  },
};

export default action;
