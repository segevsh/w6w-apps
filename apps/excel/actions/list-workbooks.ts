import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, odataString, type PagedResult } from "../lib/client.ts";
import { listOutput, searchPagingParams } from "../lib/params.ts";

interface Input {
  query?: string;
  xlsxOnly?: boolean;
  select?: string[];
  orderby?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface DriveItem {
  id?: string;
  name?: string;
  [k: string]: unknown;
}

/**
 * `GET /me/drive/root/search(q='…')`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-search
 *
 * The workbook APIs address a file by driveItem id or by path, and neither is
 * something a user has to hand — so discovery has to come from the Drive API.
 * This is the only action here that is not a workbook call.
 *
 * Two honest caveats, both surfaced in the params rather than buried:
 *
 *  - Graph's search matches "across several fields including filename, metadata,
 *    and file content", so a query of `.xlsx` returns more than spreadsheets.
 *    `xlsxOnly` filters the returned page by filename extension **client-side**;
 *    it is a convenience, not a server-side filter, so it can shrink a page
 *    below the requested `$top`.
 *  - The Excel API serves only Office Open XML workbooks — `.xls` is not
 *    supported — which is why the extension filter is `.xlsx`/`.xlsm` and not a
 *    general "spreadsheet" test.
 *
 * Requires `Files.Read` at minimum; this App's `Files.ReadWrite` covers it.
 */
const listWorkbooks: ActionDefinition<Input, PagedResult<DriveItem>> = {
  key: "list-workbooks",
  type: "search",
  resource: "workbook",
  title: "List Workbooks",
  description:
    "Find Excel workbooks in the signed-in user's drive and return their driveItem ids, so the other actions have something to address.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      default: ".xlsx",
      hint:
        "OData `search(q=…)`. Matches filename, metadata and file content — a bare extension is a broad match, not a filter.",
    },
    {
      key: "xlsxOnly",
      label: "Workbooks only",
      type: "boolean",
      default: true,
      hint:
        "Drop results whose filename does not end in `.xlsx` or `.xlsm`. Applied to the returned page after the fact, so a page can come back shorter than the page size.",
    },
    {
      key: "orderby",
      label: "Order by",
      type: "string",
      advanced: true,
      hint: "OData `$orderby`, e.g. `lastModifiedDateTime desc`.",
    },
    ...searchPagingParams(),
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`, e.g. `id`, `name`, `webUrl`, `lastModifiedDateTime`.",
    },
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<DriveItem>> {
    const client = new GraphClient(ctx);
    const term = (input.query ?? ".xlsx").trim() || ".xlsx";
    const path = `/me/drive/root/search(q='${odataString(term)}')`;
    const options = {
      query: {
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
      },
    };

    // A nextLink already encodes every query parameter from the original call,
    // so it is replayed verbatim rather than re-decorated.
    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    const result = input.all
      ? await client.collect<DriveItem>(target, opts, input.maxPages ?? 10)
      : await client.page<DriveItem>(target, opts);

    if (input.xlsxOnly === false) return result;
    return {
      ...result,
      value: result.value.filter((item) => /\.(xlsx|xlsm)$/i.test(item?.name ?? "")),
    };
  },
};

export default listWorkbooks;
