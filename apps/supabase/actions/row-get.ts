import type { ActionDefinition } from "@w6w/types";
import { SupabaseClient } from "../lib/client.ts";
import { filtersParam, selectParam, tableParam } from "../lib/params.ts";

interface Input {
  table: string;
  filters: string;
  select?: string;
}

const rowGet: ActionDefinition<Input> = {
  key: "row-get",
  type: "read",
  resource: "rows",
  title: "Get Row",
  description: "Get a single row by filter. Fails if the filter matches zero or more than one row.",
  params: [
    tableParam,
    filtersParam({
      required: true,
      hint: 'Raw PostgREST filter query string identifying exactly one row, e.g. "id=eq.5".',
    }),
    selectParam,
  ],
  output: [
    { key: "row", type: "object", label: "The matched row" },
  ],

  async execute(input, ctx) {
    // `Accept: application/vnd.pgrst.object+json` asks PostgREST for a bare
    // object instead of a one-element array, and makes it answer 406 if the
    // filter matches zero or more than one row — see
    // https://postgrest.org/en/stable/references/api/resource_representation.html.
    const row = await new SupabaseClient(ctx).request(`/${input.table}`, {
      query: { select: input.select || "*" },
      filters: input.filters,
      headers: { accept: "application/vnd.pgrst.object+json" },
    });
    return { row };
  },
};

export default rowGet;
