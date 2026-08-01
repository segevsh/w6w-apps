import type { ActionDefinition } from "@w6w/types";
import { ServiceNowClient, tablePath, unset } from "../lib/client.ts";
import { pagination, queryParam, readOptions } from "../lib/params.ts";

interface Input {
  table: string;
  query?: string;
  limit?: number;
  offset?: number;
  fields?: string;
  displayValue?: string;
}

const tableRecordGetMany: ActionDefinition<Input> = {
  key: "table-record-get-many",
  type: "search",
  resource: "table-record",
  title: "List Table Records",
  description: "List records from an arbitrary table, optionally filtered with an encoded query.",
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "problem",
      hint: "The table's technical name.",
    },
    queryParam,
    ...pagination,
    ...readOptions,
  ],
  output: [{ key: "result", type: "array", label: "Records" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(tablePath(input.table), {
      query: {
        sysparm_query: unset(input.query),
        sysparm_limit: input.limit,
        sysparm_offset: input.offset,
        sysparm_fields: unset(input.fields),
        sysparm_display_value: input.displayValue,
      },
    });
  },
};

export default tableRecordGetMany;
