import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
}

/** `DELETE /forms/{formId}` — answers 204. A retry after success is a 404, so not idempotent. */
const formDelete: ActionDefinition<Input> = {
  key: "form-delete",
  type: "perform",
  resource: "form",
  title: "Delete Form",
  description: "Delete a form. Requires forms:write on an upgraded workspace.",
  idempotent: false,
  params: [formIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "True when Formspark answered 204" },
    { key: "id", type: "string", label: "The deleted form's ID" },
  ],

  async execute(input, ctx) {
    const id = seg(input.formId, "formId");
    await new FormsparkClient(ctx).request(`/forms/${id}`, { method: "DELETE" });
    return { deleted: true, id: input.formId.trim() };
  },
};

export default formDelete;
