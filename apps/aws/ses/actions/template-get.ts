import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * GetEmailTemplate — `GET /v2/email/templates/{TemplateName}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetEmailTemplate.html
 */
interface Input {
  templateName: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Read one stored email template, including its subject, HTML and text.",
  params: [
    { key: "templateName", label: "Template name", type: "string", required: true },
  ],
  output: [
    { key: "templateName", type: "string", label: "Template name" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "html", type: "string", label: "HTML body" },
    { key: "text", type: "string", label: "Text body" },
  ],

  async execute(input, ctx) {
    const res = await ses<{
      TemplateName: string;
      TemplateContent?: { Subject?: string; Html?: string; Text?: string };
    }>(ctx, {
      op: "GetEmailTemplate",
      path: `/v2/email/templates/${seg(input.templateName)}`,
    });
    return {
      templateName: res.TemplateName,
      subject: res.TemplateContent?.Subject,
      html: res.TemplateContent?.Html,
      text: res.TemplateContent?.Text,
    };
  },
};

export default action;
