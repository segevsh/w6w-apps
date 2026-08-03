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
  worksheet?: string;
  select?: string[];
  top?: number;
  skip?: number;
  sessionId?: string;
}

interface Table {
  id?: string;
  name?: string;
  showHeaders?: boolean;
  showTotals?: boolean;
  style?: string;
}

/**
 * `GET …/workbook/tables` — every table in the workbook.
 * `GET …/workbook/worksheets/{id|name}/tables` — tables on one sheet.
 *
 * https://learn.microsoft.com/en-us/graph/api/table-list
 *
 * Tables are the structured alternative to raw ranges: they have names, a header
 * row, and an append-to-the-end semantics that a range address cannot express.
 * Both the `id` (a numeric string, e.g. `"2"`) and the `name` address a table in
 * later calls.
 *
 * Microsoft's guidance for this collection is `$top` + `$skip`; there is no
 * cursor.
 */
const listTables: ActionDefinition<Input, PagedResult<Table>> = {
  key: "list-tables",
  type: "read",
  resource: "table",
  title: "List Tables",
  description:
    "List the tables in a workbook, or just those on one worksheet, with their ids and names.",
  params: [
    ...workbookParams(),
    {
      key: "worksheet",
      label: "Worksheet",
      type: "string",
      hint: "Scope to one worksheet by name or id. Leave empty for every table in the workbook.",
    },
    ...collectionParams({ defaultTop: 50 }),
    sessionIdParam,
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Table>> {
    const client = new GraphClient(ctx);
    const base = workbookPath(input);
    const path = input.worksheet?.trim()
      ? `${base}/worksheets/${segment(input.worksheet)}/tables`
      : `${base}/tables`;

    return await client.page<Table>(path, {
      query: {
        $select: odataList(input.select),
        $top: input.top,
        $skip: input.skip,
      },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default listTables;
