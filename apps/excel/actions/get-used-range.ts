import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataList,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  valuesOnly?: boolean;
  select?: string[];
  sessionId?: string;
}

interface Range {
  address?: string;
  values?: unknown[][];
  text?: string[][];
  rowCount?: number;
  columnCount?: number;
  [k: string]: unknown;
}

/**
 * `GET …/workbook/worksheets/{id|name}/usedRange`
 * `GET …/workbook/worksheets/{id|name}/usedRange(valuesOnly=true)`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-usedrange
 *
 * "The smallest range that encompasses any cells that have a value **or
 * formatting** assigned to them." That last clause is the reason `valuesOnly`
 * exists and is defaulted to `true` here: a sheet where someone once bolded row
 * 5000 has a used range 5000 rows tall, and the default-`false` behaviour hands
 * back thousands of empty rows. `valuesOnly=true` considers only cells with
 * values.
 *
 * On a blank worksheet this returns the top-left cell rather than failing.
 *
 * This is the action to reach for when you want "read the whole sheet" — Get
 * Range with an empty address returns the entire million-row grid instead.
 */
const getUsedRange: ActionDefinition<Input, Range> = {
  key: "get-used-range",
  type: "read",
  resource: "range",
  title: "Get Used Range",
  description:
    "Read the smallest range covering the worksheet's actual data — the practical 'read the whole sheet'.",
  params: [
    ...workbookParams(),
    worksheetParam(),
    {
      key: "valuesOnly",
      label: "Values only",
      type: "boolean",
      default: true,
      hint:
        "On: only cells with values count as used. Off (Graph's own default): formatting counts too, so a stray bolded cell far down the sheet inflates the range by thousands of empty rows.",
    },
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`, e.g. `values`, `text`, `address`.",
    },
    sessionIdParam,
  ],
  output: [
    { key: "address", type: "string", label: "Address" },
    { key: "values", type: "array", label: "Values" },
    { key: "text", type: "array", label: "Display text" },
    { key: "rowCount", type: "number", label: "Rows" },
    { key: "columnCount", type: "number", label: "Columns" },
  ],

  async execute(input, ctx): Promise<Range> {
    const client = new GraphClient(ctx);
    // `valuesOnly` is an OData *function* parameter, so it rides in the path
    // rather than the query string.
    const valuesOnly = input.valuesOnly ?? true;
    const fn = valuesOnly ? "/usedRange(valuesOnly=true)" : "/usedRange";
    const path = `${workbookPath(input)}/worksheets/${segment(input.worksheet)}${fn}`;

    return await client.request<Range>(path, {
      query: { $select: odataList(input.select) },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default getUsedRange;
