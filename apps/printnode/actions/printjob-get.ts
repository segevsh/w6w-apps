import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet, toSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /printjobs/{PRINT JOB SET}`, or
 * `GET /printers/{PRINTER SET}/printjobs/{PRINT JOB SET}` when printer ids are given.
 */
interface Input extends Pagination {
  printJobIds: string | number;
  printerIds?: string | number;
}

const printjobGet: ActionDefinition<Input> = {
  key: "printjob-get",
  type: "read",
  resource: "printjob",
  title: "Get Print Jobs",
  description: "Fetch one or more print jobs by id. Returns a list.",
  params: [
    {
      key: "printJobIds",
      label: "Print job ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `623,624`.",
    },
    {
      key: "printerIds",
      label: "Printer ID(s)",
      type: "string",
      hint: "Optional. Restrict the lookup to jobs on these printers.",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "Print jobs" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const jobs = toSet(input.printJobIds, "Print job ID(s)");
    const printers = toOptionalSet(input.printerIds, "Printer ID(s)");
    const path = printers ? `/printers/${printers}/printjobs/${jobs}` : `/printjobs/${jobs}`;
    return new PrintNodeClient(ctx).list(path, paginationQuery(input));
  },
};

export default printjobGet;
