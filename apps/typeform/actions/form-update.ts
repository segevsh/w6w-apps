import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  formId: string;
  form: Record<string, unknown>;
}

/**
 * PUT /forms/{id} — replace a form's definition. Typeform's PUT is a full
 * replacement (its PATCH variant takes JSON-Patch operations, which is not
 * modeled here), so `form` must be the complete form object — typically one
 * read back from `form-get`, edited, and written whole.
 */
const formUpdate: ActionDefinition<Input> = {
  key: "form-update",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description: "Replace a form's definition with a complete form object (PUT).",
  // A PUT writes an absolute value, so replaying it converges on the same form.
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "form",
      label: "Form definition",
      type: "json",
      required: true,
      hint: "The complete form object to write, e.g. the output of Get Form with edits.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request(`/forms/${encodeURIComponent(input.formId)}`, {
      method: "PUT",
      body: input.form,
    });
  },
};

export default formUpdate;
