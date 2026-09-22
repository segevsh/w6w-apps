import type { ActionDefinition } from "@w6w/types";
import { unwrapList, WorkizClient } from "../lib/client.ts";
import { listFilters } from "../lib/params.ts";
import type { Job } from "../lib/schema.ts";

/**
 * `GET /job/all/` — a page of jobs.
 *
 * The filter set is identical to `/lead/all/`'s, `start_date`'s 14-day default
 * and `only_open`'s `true` included. The seller's own spec describes two
 * readings of the response — flat `Job` rows, or rows wrapped in the `response`
 * envelope `/job/get/{UUID}/` uses — and does not disambiguate them. Both are
 * accepted here ({@link unwrapList}): a wrapped row is unwrapped, a flat row is
 * passed through untouched, so neither reading can break the action.
 */
interface Input {
  start_date?: string;
  offset?: number;
  records?: number;
  only_open?: boolean;
  status?: string[];
}

const jobList: ActionDefinition<Input, { items: Job[] }> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List jobs, filtered by date window, open-only and status, with offset paging.",
  params: listFilters(),
  output: [
    { key: "items", type: "array", label: "Jobs" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json("/job/all/", {
      query: {
        start_date: input.start_date,
        offset: input.offset,
        records: input.records,
        only_open: input.only_open,
        status: input.status,
      },
    });
    return { items: unwrapList<Job>(body) };
  },
};

export default jobList;
