import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/**
 * `DELETE /template/{id}` — delete a template.
 *
 * No response schema is documented, so only the HTTP status is reported.
 */
interface Input {
  templateId: string;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a template by id.",
  idempotent: true,
  params: [templateIdParam],
  output: [
    { key: "templateId", type: "string", label: "Template deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new ParseurClient(ctx).status(`/template/${encodeId(input.templateId)}`, {
      method: "DELETE",
    });
    return { templateId: input.templateId, status };
  },
};

export default templateDelete;
