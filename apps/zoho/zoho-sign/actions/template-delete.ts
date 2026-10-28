import type { ActionDefinition } from "@w6w/types";
import { ZohoSignClient } from "../lib/client.ts";
import { statusOutput, templateId } from "../lib/params.ts";

interface Input {
  templateId: string;
}

/**
 * `PUT /templates/{template_id}/delete` — verified against
 * `template-managment/delete-template.html`. Moves the template to trash. No request body.
 */
const action: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Move a template to trash.",
  idempotent: true,
  params: [templateId],
  output: statusOutput,

  execute(input, ctx) {
    return new ZohoSignClient(ctx).sendEmpty(
      `/templates/${encodeURIComponent(input.templateId)}/delete`,
      "PUT",
    );
  },
};

export default action;
