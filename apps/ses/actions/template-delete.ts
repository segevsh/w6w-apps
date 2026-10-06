import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * DeleteEmailTemplate — `DELETE /v2/email/templates/{TemplateName}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_DeleteEmailTemplate.html
 */
interface Input {
  templateName: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a stored email template.",
  idempotent: true,
  params: [
    { key: "templateName", label: "Template name", type: "string", required: true },
  ],
  output: [
    { key: "templateName", type: "string", label: "Template name" },
    { key: "deleted", type: "boolean", label: "True when SES accepted the deletion" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "DeleteEmailTemplate",
      method: "DELETE",
      path: `/v2/email/templates/${seg(input.templateName)}`,
    });
    return { templateName: input.templateName, deleted: true };
  },
};

export default action;
