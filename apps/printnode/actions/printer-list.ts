import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /printers`, or `GET /computers/{COMPUTER SET}/printers` when computer ids
 * are given. Each printer embeds its parent computer and a `capabilities`
 * object (papers, bins, duplex, dpis, ...) — the source of valid print job
 * `options` values.
 */
interface Input extends Pagination {
  computerIds?: string | number;
}

const printerList: ActionDefinition<Input> = {
  key: "printer-list",
  type: "read",
  resource: "printer",
  title: "List Printers",
  description: "List printers, optionally limited to given computers.",
  params: [
    {
      key: "computerIds",
      label: "Computer ID(s)",
      type: "string",
      hint: "Optional. Only printers attached to these computers (`1,3,5`).",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "Printers" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const computers = toOptionalSet(input.computerIds, "Computer ID(s)");
    const path = computers ? `/computers/${computers}/printers` : "/printers";
    return new PrintNodeClient(ctx).list(path, paginationQuery(input));
  },
};

export default printerList;
