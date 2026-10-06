import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `POST /api/templates/{id}/delete` — permanently delete a template. */
interface Input {
  templateId: string;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a template.",
  idempotent: false,
  params: [templateIdParam],
  output: [{ key: "status", type: "string", label: "deleted" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(`/templates/${encodeId(input.templateId)}/delete`, {
      method: "POST",
    });
  },
};

export default templateDelete;
