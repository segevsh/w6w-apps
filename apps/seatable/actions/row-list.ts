import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  viewName?: string;
  start?: number;
  limit?: number;
  convertKeys?: boolean;
}

const rowList: ActionDefinition<Input> = {
  key: "row-list",
  type: "read",
  resource: "row",
  title: "List Rows",
  description:
    "Rows of a table, or of one view of it. Without a view every column is returned, hidden " +
    "ones included; with a view only that view's visible columns. Link columns return at most " +
    "50 linked records per row. Page with Start and Limit.",
  params: [
    tableNameParam,
    {
      key: "viewName",
      label: "View name",
      type: "string",
      hint: "Optional. Applies the view's filters, sorts and hidden columns.",
    },
    {
      key: "start",
      label: "Start",
      type: "number",
      default: 0,
      validation: { min: 0, integer: true },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { min: 1, max: 1000, integer: true },
      hint: "The vendor default is 1,000, which is also the maximum.",
    },
    {
      key: "convertKeys",
      label: "Return column names",
      type: "boolean",
      default: true,
      hint: "On: rows are keyed by column name. Off: by internal column key (the vendor default).",
    },
  ],
  output: [{ key: "rows", type: "array", label: "Rows" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/rows/", {
      query: {
        table_name: input.tableName,
        view_name: input.viewName,
        start: input.start,
        limit: input.limit ?? 100,
        convert_keys: input.convertKeys ?? true,
      },
    });
  },
};

export default rowList;
