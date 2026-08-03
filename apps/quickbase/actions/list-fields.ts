import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  includeFieldPerms?: boolean;
}

export interface QuickbaseField {
  id?: number;
  label?: string;
  fieldType?: string;
  mode?: string;
  required?: boolean;
  unique?: boolean;
  noWrap?: boolean;
  bold?: boolean;
  appearsByDefault?: boolean;
  findEnabled?: boolean;
  doesDataCopy?: boolean;
  fieldHelp?: string;
  audited?: boolean;
  properties?: Record<string, unknown>;
  permissions?: Array<Record<string, unknown>>;
}

/**
 * `GET /fields?tableId=…` — the field dictionary for a table.
 *
 * This is the lookup that makes every other record action legible: Quickbase
 * returns and accepts records keyed by numeric **field ID**, so a workflow that
 * wants to write to "Email Address" needs this call to learn that it is field
 * 9. Response is a bare array.
 *
 * `mode` is worth checking before writing: a field with `mode: "virtual"` or
 * `"lookup"` is derived, and `upsert-records` cannot set it.
 *
 * `includeFieldPerms` adds a per-role permission list to each field — off by
 * default because it makes the payload substantially larger and most callers
 * only want the id/label map.
 */
const listFields: ActionDefinition<Input, QuickbaseField[]> = {
  key: "list-fields",
  type: "read",
  resource: "field",
  title: "List Fields",
  description:
    "List every field in a table, with its ID, label and type — the map from field names to the IDs the record actions use.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "includeFieldPerms",
      label: "Include field permissions",
      type: "boolean",
      hint: "Adds each field's per-role permissions. Makes the response much larger.",
    },
  ],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseField[]>("fields", {
      query: {
        tableId: input.tableId,
        includeFieldPerms: input.includeFieldPerms,
      },
    });
  },
};

export default listFields;
