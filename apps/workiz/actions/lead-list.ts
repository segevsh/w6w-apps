import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { listFilters } from "../lib/params.ts";
import type { Lead } from "../lib/schema.ts";

/**
 * `GET /lead/all/` — a page of leads.
 *
 * The vendor's own NOTICE on `start_date`: "if `start_date` is not provided,
 * the default range is the last 14 days". `only_open` defaults to `true`, which
 * excludes the Done and Canceled statuses; turning it off is the only way to
 * see closed leads. `records` defaults to 100 and the spec declares 100 its
 * maximum, so there is no larger page to ask for — paging is `offset` + the
 * same window.
 *
 * The response is a bare array of `Lead` rows.
 */
interface Input {
  start_date?: string;
  offset?: number;
  records?: number;
  only_open?: boolean;
  status?: string[];
}

const leadList: ActionDefinition<Input, { items: Lead[] }> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description: "List leads, filtered by date window, open-only and status, with offset paging.",
  params: listFilters(),
  output: [
    { key: "items", type: "array", label: "Leads" },
  ],

  async execute(input, ctx) {
    const items = await new WorkizClient(ctx).json<Lead[]>("/lead/all/", {
      query: {
        start_date: input.start_date,
        offset: input.offset,
        records: input.records,
        only_open: input.only_open,
        status: input.status,
      },
    });
    return { items: items ?? [] };
  },
};

export default leadList;
