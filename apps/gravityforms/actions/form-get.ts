import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
}

/**
 * `GET /gf/v2/forms/[FORM_ID]` — one complete Form Object.
 *
 * This is the call that gives you the form's field IDs and input names, which
 * every write action needs: `fields[].id` addresses an entry value
 * (Create Entry), and `input_<id>` addresses a submitted value (Submit Form).
 *
 * Capability: `gravityforms_edit_forms`.
 */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one form, including every field definition and setting.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "From Get Many Forms, or the ID column in Forms -> Forms.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "fields", type: "array", label: "Field objects" },
    { key: "notifications", type: "object", label: "Notifications keyed by ID" },
    { key: "confirmations", type: "object", label: "Confirmations keyed by ID" },
    { key: "is_active", type: "string", label: "Whether the form accepts entries" },
  ],

  execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    return client.request(`/forms/${encodeURIComponent(String(input.formId))}`);
  },
};

export default formGet;
