import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam, templateKindParam } from "../lib/params.ts";

interface Input {
  formId: string;
  kind: string;
}

/** `DELETE /forms/{formId}/templates/{kind}` — answers 204; 503 means retry after a pause. */
const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Email Template",
  description: "Delete a form's notification or autoresponder template.",
  idempotent: false,
  params: [formIdParam, templateKindParam],
  output: [
    { key: "deleted", type: "boolean", label: "True when Formspark answered 204" },
    { key: "formId", type: "string", label: "Form ID" },
    { key: "kind", type: "string", label: "Template kind" },
  ],

  async execute(input, ctx) {
    const f = seg(input.formId, "formId");
    const k = seg(input.kind, "kind");
    await new FormsparkClient(ctx).request(`/forms/${f}/templates/${k}`, { method: "DELETE" });
    return { deleted: true, formId: input.formId.trim(), kind: input.kind.trim() };
  },
};

export default templateDelete;
