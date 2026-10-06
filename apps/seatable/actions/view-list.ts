import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
}

const viewList: ActionDefinition<Input> = {
  key: "view-list",
  type: "read",
  resource: "view",
  title: "List Views",
  description:
    "All views of a table with their settings: filters, sorts, groupings, hidden columns.",
  params: [tableNameParam],
  output: [{ key: "views", type: "array", label: "Views" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/views/", { query: { table_name: input.tableName } });
  },
};

export default viewList;
