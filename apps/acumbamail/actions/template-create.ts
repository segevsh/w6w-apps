import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  template_name: string;
  html_content: string;
  id?: number | string;
  custom_category?: string;
  subject?: string;
}

/** `POST /api/1/createTemplate/` */
const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  title: "Create or Update Template",
  description:
    "Create a template, or update one when Template ID is given. Returns the template ID (empty if not created). Not marked safe to retry as a create.",
  idempotent: false,
  params: [
    {
      key: "template_name",
      label: "Template name",
      type: "string",
      required: true,
    },
    {
      key: "html_content",
      label: "HTML content",
      type: "text",
      required: true,
    },
    {
      key: "id",
      label: "Template ID",
      type: "number",
      hint: "Set to update an existing template instead of creating one.",
    },
    {
      key: "custom_category",
      label: "Category",
      type: "string",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
    },
  ],
  output: [{ key: "id", type: "string", label: "Identifier returned by the vendor" }],

  async execute(input, ctx) {
    const result = await call(ctx, "createTemplate", {
      template_name: required("template_name", input.template_name),
      html_content: required("html_content", input.html_content),
      id: input.id,
      custom_category: input.custom_category,
      subject: input.subject,
    });
    return { id: result === null || result === undefined ? null : String(result) };
  },
};

export default templateCreate;
