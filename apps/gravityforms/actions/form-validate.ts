import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  inputValues: Record<string, unknown>;
  fieldValues?: Record<string, unknown>;
  sourcePage?: number;
  targetPage?: number;
}

/**
 * `POST /gf/v2/forms/[FORM_ID]/submissions/validation` — run a form's own
 * validation over a set of values WITHOUT creating an entry, firing feeds or
 * sending notifications.
 *
 * Same body shape as Submit Form (values keyed by field input name, e.g.
 * `input_1`), and the same response minus the confirmation half, plus `is_spam`
 * — which the vendor documents as present only when validation succeeds.
 *
 * This is the dry-run partner to Submit Form: check `is_valid` here, fix the
 * payload, then submit for real.
 */
const formValidate: ActionDefinition<Input> = {
  key: "form-validate",
  type: "perform",
  resource: "form",
  title: "Validate Form Submission",
  description:
    "Validate values against a form's rules without creating an entry, running feeds or sending notifications.",
  // A POST, but a side-effect-free one: it creates nothing and notifies nobody,
  // so retrying it is always safe.
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "inputValues",
      label: "Input Values",
      type: "json",
      required: true,
      hint: 'Keyed by field INPUT NAME, e.g. {"input_1_3":"Neil","input_3":"neil@example.com"}. ' +
        "Use Get Form for the field IDs.",
    },
    {
      key: "fieldValues",
      label: "Field Values",
      type: "json",
      hint: "Dynamic population parameter keys with their values. Sent as `field_values`.",
    },
    { key: "sourcePage", label: "Source Page", type: "number" },
    { key: "targetPage", label: "Target Page", type: "number" },
  ],
  output: [
    { key: "is_valid", type: "boolean", label: "Whether the values passed validation" },
    { key: "validation_messages", type: "object", label: "Per-field validation messages" },
    { key: "page_number", type: "number", label: "Page number to display next" },
    { key: "source_page_number", type: "number", label: "Page the values came from" },
    { key: "is_spam", type: "boolean", label: "Anti-spam verdict (present only when valid)" },
  ],

  execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    const body: Record<string, unknown> = { ...(input.inputValues ?? {}) };
    if (input.fieldValues !== undefined) body.field_values = input.fieldValues;
    if (input.sourcePage !== undefined) body.source_page = input.sourcePage;
    if (input.targetPage !== undefined) body.target_page = input.targetPage;
    return client.request(
      `/forms/${encodeURIComponent(String(input.formId))}/submissions/validation`,
      { method: "POST", body },
    );
  },
};

export default formValidate;
