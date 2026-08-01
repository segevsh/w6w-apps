import type { ActionDefinition } from "@w6w/types";
import { fieldsBody, ServiceNowClient, tablePath } from "../lib/client.ts";

interface Input {
  table: string;
  fields: unknown;
}

/**
 * Create a record on any table, not just `incident` — `problem`,
 * `change_request`, `cmdb_ci`, a custom `u_*` table, anything the Table API
 * exposes.
 */
const tableRecordCreate: ActionDefinition<Input> = {
  key: "table-record-create",
  type: "perform",
  resource: "table-record",
  title: "Create Table Record",
  description: "Create a record on an arbitrary table via the Table API.",
  idempotent: false,
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "problem",
      hint:
        "The table's technical name, e.g. `problem`, `change_request`, `cmdb_ci`, `u_my_table`.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Column name -> value, e.g. { "short_description": "New problem", "priority": "2" }.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Record" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(tablePath(input.table), {
      method: "POST",
      body: fieldsBody(input.fields),
    });
  },
};

export default tableRecordCreate;
