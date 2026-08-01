import type { ActionDefinition } from "@w6w/types";
import { SupabaseClient } from "../lib/client.ts";
import {
  filtersParam,
  limitParam,
  offsetParam,
  orderParam,
  selectParam,
  tableParam,
} from "../lib/params.ts";

interface Input {
  table: string;
  select?: string;
  filters?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

const rowsList: ActionDefinition<Input> = {
  key: "rows-list",
  type: "search",
  resource: "rows",
  title: "List Rows",
  description: "Query rows from a table or view, with PostgREST filter/select/order/paging syntax.",
  params: [
    tableParam,
    selectParam,
    filtersParam(),
    orderParam,
    limitParam,
    offsetParam,
  ],
  output: [
    { key: "rows", type: "array", label: "Matching rows" },
  ],

  async execute(input, ctx) {
    const rows = await new SupabaseClient(ctx).request<unknown[]>(`/${input.table}`, {
      query: {
        select: input.select || "*",
        order: input.order || undefined,
        limit: input.limit,
        offset: input.offset,
      },
      filters: input.filters,
    });
    return { rows };
  },
};

export default rowsList;
