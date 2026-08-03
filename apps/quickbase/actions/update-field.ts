import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonOptional, QuickbaseClient } from "../lib/client.ts";
import type { QuickbaseField } from "./list-fields.ts";

interface Input {
  tableId: string;
  fieldId: number;
  label?: string;
  fieldHelp?: string;
  required?: boolean;
  unique?: boolean;
  appearsByDefault?: boolean;
  findEnabled?: boolean;
  audited?: boolean;
  properties?: unknown;
}

/**
 * `POST /fields/{fieldId}?tableId=…` — update.
 *
 * There is deliberately no `fieldType` param: Quickbase's update body has no
 * such property, because changing a field's type is not an update — it is a
 * conversion with data-loss semantics that the platform handles through its own
 * UI. Offering it here would produce a param the API ignores.
 *
 * Unset params are dropped, so an update that only renames a field leaves its
 * `properties` untouched.
 */
const updateField: ActionDefinition<Input, QuickbaseField> = {
  key: "update-field",
  type: "perform",
  resource: "field",
  title: "Update Field",
  // `true`: re-applying the same field settings converges.
  idempotent: true,
  description: "Update a field's label, help text or settings. Unset fields are left alone.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "fieldId", label: "Field ID", type: "number", required: true },
    { key: "label", label: "Label", type: "string" },
    { key: "fieldHelp", label: "Help text", type: "text" },
    { key: "required", label: "Required", type: "boolean" },
    { key: "unique", label: "Unique", type: "boolean" },
    { key: "appearsByDefault", label: "Appears on forms by default", type: "boolean" },
    { key: "findEnabled", label: "Searchable", type: "boolean" },
    { key: "audited", label: "Audited", type: "boolean" },
    {
      key: "properties",
      label: "Type-specific properties",
      type: "json",
      hint: "Merged into the field's existing type-specific properties.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "label", type: "string", label: "Label" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseField>(
      `fields/${encodeURIComponent(String(input.fieldId))}`,
      {
        method: "POST",
        query: { tableId: input.tableId },
        body: compact({
          label: input.label,
          fieldHelp: input.fieldHelp,
          required: input.required,
          unique: input.unique,
          appearsByDefault: input.appearsByDefault,
          findEnabled: input.findEnabled,
          audited: input.audited,
          properties: parseJsonOptional<Record<string, unknown>>(
            input.properties,
            "Type-specific properties",
          ),
        }),
      },
    );
  },
};

export default updateField;
