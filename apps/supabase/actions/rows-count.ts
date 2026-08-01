import type { ActionDefinition } from "@w6w/types";
import { SupabaseClient } from "../lib/client.ts";
import { filtersParam, tableParam } from "../lib/params.ts";

interface Input {
  table: string;
  filters?: string;
}

const rowsCount: ActionDefinition<Input> = {
  key: "rows-count",
  type: "read",
  resource: "rows",
  title: "Count Rows",
  description: "Count matching rows without transferring them, via `HEAD` + `Prefer: count=exact`.",
  params: [
    tableParam,
    filtersParam(),
  ],
  output: [
    { key: "count", type: "number", label: "Exact row count" },
  ],

  async execute(input, ctx) {
    const { count } = await new SupabaseClient(ctx).count(`/${input.table}`, {
      query: { select: "*" },
      filters: input.filters,
    });
    return { count };
  },
};

export default rowsCount;
