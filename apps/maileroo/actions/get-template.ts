import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  templateId: number;
}

/** `GET /v1/templates/:template_id` (scope `templates.read`). */
const getTemplate: ActionDefinition<Input> = {
  key: "get-template",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Read one template including its HTML and plain-text content. Account API Key " +
    "(templates.read).",
  params: [{
    key: "templateId",
    label: "Template ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
  }],
  output: [
    { key: "id", type: "number", label: "Template ID" },
    { key: "type", type: "string", label: "Template type" },
    { key: "templateName", type: "string", label: "Name" },
    { key: "previewImage", type: "string", label: "Preview image URL" },
    { key: "previewUrl", type: "string", label: "Preview URL" },
    { key: "processed", type: "number", label: "Processing state flag" },
    { key: "html", type: "string", label: "HTML content" },
    { key: "plaintext", type: "string", label: "Plain-text content" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/templates/${seg(input.templateId, "templateId")}`,
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      type: d.type,
      templateName: d.template_name,
      previewImage: d.preview_image,
      previewUrl: d.preview_url,
      processed: d.processed,
      html: d.html,
      plaintext: d.plaintext,
    };
  },
};

export default getTemplate;
