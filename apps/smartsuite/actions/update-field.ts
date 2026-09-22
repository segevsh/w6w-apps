import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  field: Record<string, unknown>;
}

/**
 * `PUT /applications/{tableId}/change_field/` — change an existing Field.
 *
 * Same body shape as `add-field` — `{ "field": { … } }` — but the field is
 * identified by the `slug` inside the body, so the supplied `field.slug` must
 * be an existing field's slug. Send only the keys being changed; the rest keep
 * their current values.
 */
const updateField: ActionDefinition<Input> = {
  key: "update-field",
  type: "perform",
  resource: "field",
  title: "Update Field",
  description:
    "Change an existing Field on a SmartSuite Table (PUT /applications/{tableId}/change_field/).",
  idempotent: true,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table holding the field.",
    },
    {
      key: "field",
      label: "Field changes",
      type: "json",
      required: true,
      hint: "The `field` object, including the existing field's `slug` and the keys to change " +
        "(`label`, `field_type`, type-specific config…).",
    },
  ],
  output: [
    { key: "slug", type: "string", label: "Field slug" },
    { key: "label", type: "string", label: "Field label" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/change_field/`,
      { method: "PUT", body: { field: input.field } },
    );
  },
};

export default updateField;
