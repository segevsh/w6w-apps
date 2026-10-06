import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SeaTableClient } from "../lib/client.ts";
import { rowIdParam, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  rowId: string;
  convertKeys?: boolean;
}

const rowGet: ActionDefinition<Input> = {
  key: "row-get",
  type: "read",
  resource: "row",
  title: "Get Row",
  description: "One row with all its columns, by row ID. The row object is the whole response.",
  params: [
    tableNameParam,
    rowIdParam,
    {
      key: "convertKeys",
      label: "Return column names",
      type: "boolean",
      default: true,
      hint: "On: keyed by column name. Off: by internal column key (the vendor default).",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Row ID" },
    { key: "_mtime", type: "string", label: "Last modified" },
  ],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request(`/rows/${encodeSegment(input.rowId)}/`, {
      query: { table_name: input.tableName, convert_keys: input.convertKeys ?? true },
    });
  },
};

export default rowGet;
