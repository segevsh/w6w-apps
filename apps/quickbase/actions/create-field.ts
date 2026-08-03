import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonOptional, QuickbaseClient } from "../lib/client.ts";
import type { QuickbaseField } from "./list-fields.ts";

interface Input {
  tableId: string;
  label: string;
  fieldType: string;
  fieldHelp?: string;
  required?: boolean;
  unique?: boolean;
  appearsByDefault?: boolean;
  findEnabled?: boolean;
  audited?: boolean;
  properties?: unknown;
}

/**
 * `POST /fields?tableId=…`.
 *
 * `fieldType` is a closed vocabulary. The values below are taken from the
 * enumeration in Quickbase's published spec rather than from memory; a type
 * outside it is rejected by the API, not silently coerced.
 *
 * Everything type-specific — a formula, the choices for a multiple-choice
 * field, the target of a lookup, decimal places — goes in `properties`, which
 * carries roughly sixty possible keys depending on `fieldType`. It is exposed as
 * free-form JSON rather than sixty conditional params: the valid set is a
 * function of the type, and enumerating it in a static form would mislead more
 * than it helped. `list-fields` on an existing table of the same type is the
 * quickest way to see the right shape.
 */
const FIELD_TYPES = [
  "text",
  "text-multiple-choice",
  "text-multi-line",
  "rich-text",
  "numeric",
  "currency",
  "rating",
  "percent",
  "multitext",
  "email",
  "url",
  "duration",
  "date",
  "datetime",
  "timestamp",
  "timeofday",
  "checkbox",
  "user",
  "multiuser",
  "address",
  "phone",
  "file",
] as const;

const createField: ActionDefinition<Input, QuickbaseField> = {
  key: "create-field",
  type: "perform",
  resource: "field",
  title: "Create Field",
  // `false`: each call mints a new field id, and Quickbase permits duplicate
  // field labels — so a retry adds a second column rather than failing.
  idempotent: false,
  description: "Add a field to a table.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "label", label: "Label", type: "string", required: true },
    {
      key: "fieldType",
      label: "Field type",
      type: "select",
      required: true,
      options: FIELD_TYPES.map((value) => ({ value, label: value })),
    },
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
      hint:
        'Depends on the field type — e.g. {"formula": "[Price]*[Qty]", "decimalPlaces": 2}. Run List Fields on a similar field to see the shape.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "fieldType", type: "string", label: "Field type" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseField>("fields", {
      method: "POST",
      query: { tableId: input.tableId },
      body: compact({
        label: input.label,
        fieldType: input.fieldType,
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
    });
  },
};

export default createField;
