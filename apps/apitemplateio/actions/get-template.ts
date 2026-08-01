import type { ActionDefinition } from "@w6w/types";
import { ApiTemplateClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

interface Output {
  status?: string;
  template_id?: string;
  body?: string;
  css?: string;
  settings?: string;
  [key: string]: unknown;
}

/**
 * GET /v2/get-template — a single template's HTML body, CSS, and print
 * settings. APITemplate.io's own SDK docs mark this endpoint "experimental,
 * contact support to learn more" — it is real and documented, but the vendor
 * does not commit to it the way it does `list-templates`/`create-*`.
 */
const getTemplate: ActionDefinition<Input, Output> = {
  key: "get-template",
  type: "read",
  resource: "template",
  title: "Get Template",
  description:
    "Fetch a single template's HTML/CSS/settings by id. Vendor docs mark this endpoint experimental.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the APITemplate.io dashboard, or the List Templates action.",
    },
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "body", type: "string", label: "HTML body" },
    { key: "css", type: "string", label: "CSS" },
    { key: "settings", type: "string", label: "Print settings" },
  ],

  execute(input, ctx) {
    const client = new ApiTemplateClient(ctx);
    return client.request<Output>("/v2/get-template", {
      query: { template_id: input.templateId },
    });
  },
};

export default getTemplate;
