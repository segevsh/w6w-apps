import type { ActionDefinition } from "@w6w/types";
import { compact, postmarkFetch, postmarkJsonInit } from "../lib/client.ts";

interface Input {
  name: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  alias?: string;
  templateType?: "Standard" | "Layout" | "";
  layoutTemplate?: string;
}

/**
 * `POST /templates` — create a template or layout. `subject` is required
 * for Standard templates (omit it for a Layout). One of
 * `htmlBody`/`textBody` is required either way.
 * https://postmarkapp.com/developer/api/templates-api#create-template
 */
const createTemplate: ActionDefinition<Input> = {
  key: "create-template",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a new email template or layout on this server.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Required for Standard templates; omit for a Layout.",
    },
    { key: "htmlBody", label: "HTML Body", type: "text" },
    { key: "textBody", label: "Text Body", type: "text" },
    { key: "alias", label: "Alias", type: "string" },
    {
      key: "templateType",
      label: "Template Type",
      type: "select",
      default: "Standard",
      options: [
        { value: "Standard", label: "Standard" },
        { value: "Layout", label: "Layout" },
      ],
    },
    {
      key: "layoutTemplate",
      label: "Layout Alias",
      type: "string",
      hint: "Wrap this template in a saved Layout, by alias.",
    },
  ],
  output: [
    { key: "TemplateId", type: "number", label: "Template ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "Alias", type: "string", label: "Alias" },
    { key: "TemplateType", type: "string", label: "Template Type" },
  ],

  async execute(input, ctx) {
    if (!input.htmlBody && !input.textBody) {
      throw new Error("create-template requires `htmlBody` or `textBody`");
    }
    const payload = compact({
      Name: input.name,
      Subject: input.subject,
      HtmlBody: input.htmlBody,
      TextBody: input.textBody,
      Alias: input.alias,
      TemplateType: input.templateType || "Standard",
      LayoutTemplate: input.layoutTemplate,
    });
    return await postmarkFetch(ctx, "/templates", postmarkJsonInit("POST", payload));
  },
};

export default createTemplate;
