import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, tableIdParam } from "../lib/params.ts";

/** `GET /databases/{databaseId}/tables/{tableId}/views` — a table's saved views. */
interface Input {
  databaseId: string;
  tableId: string;
}

const tableViewsList: ActionDefinition<Input> = {
  key: "table-views-list",
  type: "search",
  resource: "table",
  title: "List Table Views",
  description: "List the views defined on a table, for use with Get Records' viewId filter.",
  params: [databaseIdParam, tableIdParam],
  output: [{ key: "data", type: "array", label: "Views" }],

  async execute(input, ctx) {
    const data = await new TablesClient(ctx).data<unknown[]>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/views`,
    );
    return { data: data ?? [] };
  },
};

export default tableViewsList;
