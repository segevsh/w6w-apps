import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, fieldNamesParam, recordIdParam, tableIdParam } from "../lib/params.ts";
import type { Param } from "@w6w/types";
import type { SoftrRecord } from "../lib/client.ts";

const updateFieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: "A JSON object mapping field IDs (or field names, with fieldNames enabled) to their new " +
    "values. Only the fields provided here are changed — Softr's own PATCH semantics.",
};

interface Input {
  databaseId: string;
  tableId: string;
  recordId: string;
  fields: Record<string, unknown>;
  fieldNames?: boolean;
}

const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Partially update a record. Only the fields provided are changed.",
  idempotent: true,
  params: [databaseIdParam, tableIdParam, recordIdParam, updateFieldsParam, fieldNamesParam],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "tableId", type: "string", label: "Table ID" },
    { key: "fields", type: "object", label: "Field values" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return await new TablesClient(ctx).data<SoftrRecord>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/records/${
        encodeId(input.recordId)
      }`,
      {
        method: "PATCH",
        query: { fieldNames: input.fieldNames },
        body: { fields: input.fields ?? {} },
      },
    );
  },
};

export default recordUpdate;
