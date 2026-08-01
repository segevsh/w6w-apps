import type { ActionDefinition } from "@w6w/types";
import { ServiceNowClient, tablePath, unset } from "../lib/client.ts";
import { readOptions } from "../lib/params.ts";

interface Input {
  table: string;
  sysId: string;
  fields?: string;
  displayValue?: string;
}

const tableRecordGet: ActionDefinition<Input> = {
  key: "table-record-get",
  type: "read",
  resource: "table-record",
  title: "Get Table Record",
  description: "Read one record from an arbitrary table by sys_id.",
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
    ...readOptions,
  ],
  output: [{ key: "result", type: "object", label: "Record" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(tablePath(input.table, input.sysId), {
      query: {
        sysparm_fields: unset(input.fields),
        sysparm_display_value: input.displayValue,
      },
    });
  },
};

export default tableRecordGet;
