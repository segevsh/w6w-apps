import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

interface Input {
  templateId: string;
}

/**
 * `GET /v1/template/properties` — a template's roles, files and settings.
 * `roles[].index` (1–50) is what `template-send`'s `roles` param addresses —
 * read this first to find the indices and names to fill in.
 */
const templateProperties: ActionDefinition<Input> = {
  key: "template-properties",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Retrieve a template's roles, files and settings.",
  params: [templateIdParam],
  output: [
    { key: "templateId", type: "string", label: "Template ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "roles", type: "array", label: "Signer roles" },
  ],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/template/properties", {
      query: { templateId: input.templateId },
    });
  },
};

export default templateProperties;
