import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, fieldNamesParam, recordIdParam, tableIdParam } from "../lib/params.ts";
import type { SoftrRecord } from "../lib/client.ts";

interface Input {
  databaseId: string;
  tableId: string;
  recordId: string;
  fieldNames?: boolean;
}

const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Single Record",
  description: "Retrieve one record by its ID.",
  params: [databaseIdParam, tableIdParam, recordIdParam, fieldNamesParam],
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
      { query: { fieldNames: input.fieldNames } },
    );
  },
};

export default recordGet;
