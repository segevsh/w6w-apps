import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  viewName?: string;
}

const columnList: ActionDefinition<Input> = {
  key: "column-list",
  type: "read",
  resource: "column",
  title: "List Columns",
  description:
    "The columns of a table (or only a view's visible ones) with their key, name, type and " +
    "type-specific `data`. Link columns carry the `link_id` and linked table the link actions need.",
  params: [
    tableNameParam,
    {
      key: "viewName",
      label: "View name",
      type: "string",
      hint: "Optional. Only that view's visible columns.",
    },
  ],
  output: [{ key: "columns", type: "array", label: "Columns" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/columns/", {
      query: { table_name: input.tableName, view_name: input.viewName },
    });
  },
};

export default columnList;
