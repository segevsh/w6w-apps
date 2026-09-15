import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import {
  databaseIdParam,
  fieldNamesParam,
  paginationParams,
  tableIdParam,
  viewIdParam,
} from "../lib/params.ts";

/**
 * `GET /databases/{databaseId}/tables/{tableId}/records` — a page of records.
 *
 * For anything beyond "give me a page", use Search Records instead: this
 * endpoint takes no filter or sort, only `offset`/`limit`/`viewId`.
 */
interface Input {
  databaseId: string;
  tableId: string;
  offset?: number;
  limit?: number;
  fieldNames?: boolean;
  viewId?: string;
}

const recordList: ActionDefinition<Input> = {
  key: "record-list",
  type: "search",
  resource: "record",
  title: "Get Records",
  description: "Retrieve a page of records from a table.",
  params: [
    databaseIdParam,
    tableIdParam,
    ...paginationParams(),
    fieldNamesParam,
    viewIdParam,
  ],
  output: [
    { key: "data", type: "array", label: "Records" },
    { key: "metadata", type: "object", label: "Paging metadata — offset, limit, total" },
  ],

  async execute(input, ctx) {
    const page = await new TablesClient(ctx).list<unknown>(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/records`,
      {
        query: {
          offset: input.offset,
          limit: input.limit,
          fieldNames: input.fieldNames,
          viewId: input.viewId,
        },
      },
    );
    return { data: page.data ?? [], metadata: page.metadata };
  },
};

export default recordList;
