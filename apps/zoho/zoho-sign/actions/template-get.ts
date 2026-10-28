import type { ActionDefinition } from "@w6w/types";
import { unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { templateId } from "../lib/params.ts";

interface Input {
  templateId: string;
}

/**
 * `GET /templates/{template_id}` — verified against
 * `template-managment/get-template-details.html`. Lists the pre-fill fields
 * (`document_fields`) that `template-create-document`'s `fieldData`/`actions` need to be
 * mapped against.
 */
const action: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Get a template's details, including the fields a document created from it needs.",
  params: [templateId],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "template_name", type: "string", label: "Template name" },
    { key: "document_fields", type: "array", label: "Fields to map when creating a document" },
    { key: "actions", type: "array", label: "Recipient roles defined on the template" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoSignClient(ctx).get(
      `/templates/${encodeURIComponent(input.templateId)}`,
    );
    return unwrapResource(body, "templates");
  },
};

export default action;
