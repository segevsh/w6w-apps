import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet, toSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /printers/{PRINTER SET}`, or
 * `GET /computers/{COMPUTER SET}/printers/{PRINTER SET}` when computer ids are given.
 */
interface Input extends Pagination {
  printerIds: string | number;
  computerIds?: string | number;
}

const printerGet: ActionDefinition<Input> = {
  key: "printer-get",
  type: "read",
  resource: "printer",
  title: "Get Printers",
  description: "Fetch one or more printers by id, including their capabilities. Returns a list.",
  params: [
    {
      key: "printerIds",
      label: "Printer ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `34,36`.",
    },
    {
      key: "computerIds",
      label: "Computer ID(s)",
      type: "string",
      hint: "Optional. Restrict the lookup to printers on these computers.",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "Printers" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const printers = toSet(input.printerIds, "Printer ID(s)");
    const computers = toOptionalSet(input.computerIds, "Computer ID(s)");
    const path = computers
      ? `/computers/${computers}/printers/${printers}`
      : `/printers/${printers}`;
    return new PrintNodeClient(ctx).list(path, paginationQuery(input));
  },
};

export default printerGet;
