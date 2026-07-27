import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

/**
 * GET /forms/{id} — retrieve a single form's full definition (fields, settings,
 * logic, theme and workspace links).
 */
const formGet: ActionDefinition<{ formId: string }> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Retrieve a single Typeform form by id.",
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "fields", type: "array", label: "Fields" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request(`/forms/${encodeURIComponent(input.formId)}`);
  },
};

export default formGet;
