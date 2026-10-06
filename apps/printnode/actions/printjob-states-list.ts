import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet } from "../lib/client.ts";
import { type Pagination, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /printjobs/states`, or `GET /printjobs/{PRINT JOB SET}/states`.
 *
 * The response is an ARRAY OF ARRAYS: one inner array of state records per
 * print job. Stable states are `new`, `sent_to_client`, `done`, `error` and
 * `expired`; other values can appear and should be tolerated. `done` means
 * handed to the operating system's queue — the physical print can still fail.
 */
interface Input extends Pagination {
  printJobIds?: string | number;
}

const printjobStatesList: ActionDefinition<Input> = {
  key: "printjob-states-list",
  type: "read",
  resource: "printjob",
  title: "Get Print Job States",
  description: "Read the state history of print jobs (new, sent_to_client, done, error, expired).",
  params: [
    {
      key: "printJobIds",
      label: "Print job ID(s)",
      type: "string",
      hint: "Optional. States for these jobs only (`623,624`); empty for recent jobs.",
    },
    ...paginationParams,
  ],
  output: [
    { key: "items", type: "array", label: "One array of states per print job" },
    { key: "count", type: "number", label: "Returned" },
    { key: "total", type: "number", label: "Total (Records-Total header)" },
  ],
  execute(input, ctx) {
    const jobs = toOptionalSet(input.printJobIds, "Print job ID(s)");
    const path = jobs ? `/printjobs/${jobs}/states` : "/printjobs/states";
    return new PrintNodeClient(ctx).list(path, paginationQuery(input));
  },
};

export default printjobStatesList;
