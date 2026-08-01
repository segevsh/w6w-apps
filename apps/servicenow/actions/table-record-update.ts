import type { ActionDefinition } from "@w6w/types";
import { fieldsBody, ServiceNowClient, tablePath } from "../lib/client.ts";

interface Input {
  table: string;
  sysId: string;
  fields: unknown;
}

const tableRecordUpdate: ActionDefinition<Input> = {
  key: "table-record-update",
  type: "perform",
  resource: "table-record",
  title: "Update Table Record",
  description:
    "Update fields on a record in an arbitrary table (PATCH — only fields sent are changed).",
  // A partial update converges on the same field values when replayed.
  idempotent: true,
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "problem",
      hint: "The table's technical name.",
    },
    { key: "sysId", label: "Sys ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Column name -> value, e.g. { "state": "3" }.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Record" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(tablePath(input.table, input.sysId), {
      method: "PATCH",
      body: fieldsBody(input.fields),
    });
  },
};

export default tableRecordUpdate;
