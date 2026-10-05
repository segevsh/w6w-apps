import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { tableKeyParam } from "../lib/params.ts";

/** `GET /v2/data-tables/:tableKey` — a table's schema, by key or `tbl_…` id. 404 if unknown. */
interface Input {
  tableKey: string;
}

const dataTableGet: ActionDefinition<Input> = {
  key: "data-table-get",
  type: "read",
  resource: "data-table",
  title: "Get Data Table",
  description: "Fetch one Data Table's schema and access rules.",
  params: [tableKeyParam],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "key", type: "string", label: "Table key" },
    { key: "name", type: "string", label: "Name" },
    { key: "createRule", type: "string", label: "Create rule" },
    { key: "readRule", type: "string", label: "Read rule" },
    { key: "updateRule", type: "string", label: "Update rule" },
    { key: "deleteRule", type: "string", label: "Delete rule" },
    { key: "fields", type: "array", label: "Fields" },
  ],

  execute(input, ctx) {
    return new MemberstackClient(ctx).json(
      `/v2/data-tables/${encodeURIComponent(input.tableKey)}`,
    );
  },
};

export default dataTableGet;
