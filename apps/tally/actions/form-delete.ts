import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
}

/** DELETE /forms/{formId} — delete a form. Responds 204 with no body. */
const formDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "form-delete",
  type: "perform",
  resource: "form",
  title: "Delete Form",
  description: "Delete a form and its submissions.",
  idempotent: true,
  params: [formIdParam],
  output: [
    { key: "formId", type: "string", label: "Deleted form ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Tally form", { formId: input.formId });
    await new TallyClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}`,
      { method: "DELETE" },
    );
    return { formId: input.formId, deleted: true };
  },
};

export default formDelete;
