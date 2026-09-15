import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, tableIdParam } from "../lib/params.ts";

/** `GET /databases/{databaseId}/tables/{tableId}` — one table's fields and views. */
interface Input {
  databaseId: string;
  tableId: string;
}

const tableGet: ActionDefinition<Input> = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get Table",
  description: "Retrieve a specific table's details, including its full field list.",
  params: [databaseIdParam, tableIdParam],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "primaryFieldId", type: "string", label: "Primary field ID" },
    { key: "defaultViewId", type: "string", label: "Default view ID" },
    { key: "fields", type: "array", label: "Fields" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return await new TablesClient(ctx).data<Record<string, unknown>>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}`,
    );
  },
};

export default tableGet;
