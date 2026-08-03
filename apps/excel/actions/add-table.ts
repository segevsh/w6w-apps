import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  address: string;
  hasHeaders?: boolean;
  worksheet?: string;
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
 * `POST …/workbook/tables/add`
 * `POST …/workbook/worksheets/{id|name}/tables/add`
 *
 * https://learn.microsoft.com/en-us/graph/api/tablecollection-add
 *
 * Note the path. The Excel conceptual overview shows
 * `POST …/workbook/tables/{table-id}/add`, which is a documentation error — the
 * operation's own reference page gives the four forms above, and `/tables/add`
 * is what this uses.
 *
 * `address` determines which sheet the table lands on: "If the address doesn't
 * contain a sheet name, the currently active sheet is used." Relying on the
 * *active* sheet from an automation is a coin flip, so either qualify the
 * address (`Sheet1!A1:D5`) or set Worksheet, which pins the collection to a
 * named sheet.
 *
 * `hasHeaders: false` makes Excel generate a header row and shift the data down
 * by one — worth knowing before you point it at a bare data block.
 *
 * Not idempotent: a retry either creates a second table or fails because the new
 * table would overlap the first. Graph offers no dedupe key. Note also that the
 * success code here is `200 OK`, not the `201 Created` most creates use.
 */
const addTable: ActionDefinition<Input, Table> = {
  key: "add-table",
  type: "perform",
  resource: "table",
  title: "Add Table",
  description: "Turn a range of cells into an Excel table.",
  idempotent: false,
  params: [
    ...workbookParams(),
    {
      key: "address",
      label: "Source range",
      type: "string",
      required: true,
      placeholder: "Sheet1!A1:D5",
      hint:
        "Address or range name of the data source. Qualify it with a sheet name — an unqualified address lands on whichever sheet happens to be active.",
    },
    {
      key: "hasHeaders",
      label: "First row is a header",
      type: "boolean",
      default: true,
      hint: "Off: Excel generates a header row and shifts your data down by one row.",
    },
    {
      key: "worksheet",
      label: "Worksheet",
      type: "string",
      advanced: true,
      hint:
        "Pin the operation to one worksheet's table collection. Usually unnecessary if the address is sheet-qualified.",
    },
    sessionIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "showHeaders", type: "boolean", label: "Shows headers" },
    { key: "showTotals", type: "boolean", label: "Shows totals" },
    { key: "style", type: "string", label: "Style" },
  ],

  async execute(input, ctx): Promise<Table> {
    const client = new GraphClient(ctx);
    const base = workbookPath(input);
    const path = input.worksheet?.trim()
      ? `${base}/worksheets/${segment(input.worksheet)}/tables/add`
      : `${base}/tables/add`;

    return await client.request<Table>(path, {
      method: "POST",
      body: { address: input.address, hasHeaders: input.hasHeaders ?? true },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default addTable;
