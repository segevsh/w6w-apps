import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /printjobs`, or `GET /printers/{PRINTER SET}/printjobs` when printer ids
 * are given. Newest first by default. Each job embeds its printer and that
 * printer's computer; the job's own `state` is only a coarse value — see
 * Get Print Job States for the full history.
 */
interface Input extends Pagination {
  printerIds?: string | number;
}

const printjobList: ActionDefinition<Input> = {
  key: "printjob-list",
  type: "read",
  resource: "printjob",
  title: "List Print Jobs",
  description: "List print jobs, optionally limited to given printers.",
  params: [
    {
      key: "printerIds",
      label: "Printer ID(s)",
      type: "string",
      hint: "Optional. Only jobs on these printers (`34,36`).",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "Print jobs" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const printers = toOptionalSet(input.printerIds, "Printer ID(s)");
    const path = printers ? `/printers/${printers}/printjobs` : "/printjobs";
    return new PrintNodeClient(ctx).list(path, paginationQuery(input));
  },
};

export default printjobList;
