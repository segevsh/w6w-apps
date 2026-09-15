import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, fieldNamesParam, fieldsParam, tableIdParam } from "../lib/params.ts";
import type { SoftrRecord } from "../lib/client.ts";

interface Input {
  databaseId: string;
  tableId: string;
  fields: Record<string, unknown>;
  fieldNames?: boolean;
}

const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create a new record in a table.",
  idempotent: false,
  params: [databaseIdParam, tableIdParam, fieldsParam, fieldNamesParam],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "tableId", type: "string", label: "Table ID" },
    { key: "fields", type: "object", label: "Field values" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return await new TablesClient(ctx).data<SoftrRecord>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/records`,
      {
        method: "POST",
        query: { fieldNames: input.fieldNames },
        body: { fields: input.fields ?? {} },
      },
    );
  },
};

export default recordCreate;
