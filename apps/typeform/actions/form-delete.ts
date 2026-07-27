import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

/**
 * DELETE /forms/{id} — permanently delete a form. Deleting a form also deletes
 * its collected responses; there is no trash to restore from.
 */
const formDelete: ActionDefinition<{ formId: string }> = {
  key: "form-delete",
  type: "perform",
  resource: "form",
  title: "Delete Form",
  description: "Permanently delete a form and its responses.",
  // Deleting an already-deleted form 404s, but the end state is identical.
  idempotent: true,
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new TypeformClient(ctx).request(`/forms/${encodeURIComponent(input.formId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default formDelete;
