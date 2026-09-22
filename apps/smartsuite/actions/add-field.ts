import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  field: Record<string, unknown>;
}

/**
 * `POST /applications/{tableId}/add_field/` — add a Field to a Table.
 *
 * The whole field definition is accepted as one opaque `json` param, wrapped
 * under the documented `{ "field": { … } }` body key. That is deliberate
 * rather than lazy: SmartSuite defines **per-field-type** configuration
 * (`slug`, `label`, `field_type`, plus type-specific keys like `params`,
 * `options`, `required`, `is_unique`), and the combinations vary too much to
 * enumerate as a flat form. The workflow's own schema knowledge is the better
 * source of truth here.
 *
 * `field.slug` must be unique within the table; `field.field_type` must be one
 * of SmartSuite's documented field types.
 */
const addField: ActionDefinition<Input> = {
  key: "add-field",
  type: "perform",
  resource: "field",
  title: "Add Field",
  description: "Add a Field to a SmartSuite Table (POST /applications/{tableId}/add_field/).",
  idempotent: false,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table to add the field to.",
    },
    {
      key: "field",
      label: "Field definition",
      type: "json",
      required: true,
      hint: "The `field` object: at least `{ slug, label, field_type }`, plus any type-specific " +
        "keys SmartSuite documents for that field type.",
    },
  ],
  output: [
    { key: "slug", type: "string", label: "Field slug" },
    { key: "label", type: "string", label: "Field label" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/add_field/`,
      { method: "POST", body: { field: input.field } },
    );
  },
};

export default addField;
