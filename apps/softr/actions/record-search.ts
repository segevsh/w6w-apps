import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import {
  databaseIdParam,
  fieldNamesParam,
  filterParam,
  paginationParams,
  sortingParam,
  tableIdParam,
} from "../lib/params.ts";

/**
 * `POST /databases/{databaseId}/tables/{tableId}/records/search` — filter,
 * sort and page records in one call.
 *
 * `filter`/`sorting` are taken as raw JSON rather than a generated form — see
 * `lib/params.ts` for why (four condition shapes, an open operator list, and
 * relative-date tokens Softr documents but does not fully enumerate a syntax
 * for). All three body fields are optional; an empty body matches everything,
 * same as Get Records.
 */
interface Input {
  databaseId: string;
  tableId: string;
  filter?: unknown;
  sorting?: unknown;
  offset?: number;
  limit?: number;
  fieldNames?: boolean;
}

const recordSearch: ActionDefinition<Input> = {
  key: "record-search",
  type: "search",
  resource: "record",
  title: "Search Records",
  description: "Search a table's records with a filter, sort order and pagination.",
  params: [
    databaseIdParam,
    tableIdParam,
    filterParam,
    sortingParam,
    ...paginationParams(),
    fieldNamesParam,
  ],
  output: [
    { key: "data", type: "array", label: "Matching records" },
    { key: "metadata", type: "object", label: "Paging metadata — offset, limit, total" },
  ],

  async execute(input, ctx) {
    const page = await new TablesClient(ctx).list<unknown>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/records/search`,
      {
        method: "POST",
        query: { fieldNames: input.fieldNames },
        body: {
          filter: input.filter,
          sorting: input.sorting,
          paging: { offset: input.offset, limit: input.limit },
        },
      },
    );
    return { data: page.data ?? [], metadata: page.metadata };
  },
};

export default recordSearch;
