import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";
import type { QuickbaseField } from "./list-fields.ts";

interface Input {
  tableId: string;
  fieldId: number;
  includeFieldPerms?: boolean;
}

/**
 * `GET /fields/{fieldId}?tableId=…`.
 *
 * Properties common to every field type come back at the top level; the ones
 * specific to a type (choices for a multiple-choice field, the formula for a
 * formula field, the target of a lookup) are nested under `properties`.
 */
const getField: ActionDefinition<Input, QuickbaseField> = {
  key: "get-field",
  type: "read",
  resource: "field",
  title: "Get Field",
  description: "Get one field's properties, including its type-specific settings.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "fieldId", label: "Field ID", type: "number", required: true },
    { key: "includeFieldPerms", label: "Include field permissions", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "fieldType", type: "string", label: "Field type" },
    { key: "properties", type: "object", label: "Type-specific properties" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseField>(
      `fields/${encodeURIComponent(String(input.fieldId))}`,
      {
        query: {
          tableId: input.tableId,
          includeFieldPerms: input.includeFieldPerms,
        },
      },
    );
  },
};

export default getField;
