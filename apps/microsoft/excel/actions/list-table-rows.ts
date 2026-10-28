import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataList,
  type PagedResult,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { collectionParams, listOutput, sessionIdParam, workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  table: string;
  worksheet?: string;
  select?: string[];
  top?: number;
  skip?: number;
  sessionId?: string;
}

interface TableRow {
  index?: number;
  values?: unknown[][];
}

/**
 * `GET …/workbook/tables/{id|name}/rows`
 * `GET …/workbook/worksheets/{id|name}/tables/{id|name}/rows`
 *
 * https://learn.microsoft.com/en-us/graph/api/table-list-rows
 *
 * Each row comes back as `{ index, values }` where `values` is a *two*-
 * dimensional array holding a single row — `[[42019, 53, 34]]`, not
 * `[42019, 53, 34]`. That shape is consistent with the range grids and with the
 * add-rows payload, so it is passed through as Graph returns it rather than
 * flattened into something that would then disagree with Add Table Rows.
 *
 * Header text is not part of the rows; it lives on the table's columns. The
 * `index` is zero-based over the data rows.
 *
 * Microsoft is unusually direct about paging here: "For reliable results, use
 * the `$top` and `$skip` query parameters to page through the results. This
 * helps avoid performance problems related to large result sets." There is no
 * cursor, so `$top` defaults to a modest 100.
 */
const listTableRows: ActionDefinition<Input, PagedResult<TableRow>> = {
  key: "list-table-rows",
  type: "read",
  resource: "table",
  title: "List Table Rows",
  description: "Read the data rows of an Excel table, in pages.",
  params: [
    ...workbookParams(),
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "Table1",
      hint: "Table name or id (the id is a numeric string such as `2`). See List Tables.",
    },
    {
      key: "worksheet",
      label: "Worksheet",
      type: "string",
      advanced: true,
      hint: "Optional — resolve the table within one worksheet's collection.",
    },
    ...collectionParams({ defaultTop: 100, maxTop: 5000 }),
    sessionIdParam,
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<TableRow>> {
    const client = new GraphClient(ctx);
    const base = workbookPath(input);
    const table = segment(input.table);
    const path = input.worksheet?.trim()
      ? `${base}/worksheets/${segment(input.worksheet)}/tables/${table}/rows`
      : `${base}/tables/${table}/rows`;

    return await client.page<TableRow>(path, {
      query: {
        $select: odataList(input.select),
        $top: input.top,
        $skip: input.skip,
      },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default listTableRows;
