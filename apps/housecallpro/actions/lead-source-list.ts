import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, sortDirectionParam } from "../lib/params.ts";

/**
 * `GET /lead_sources` — the lead-source vocabulary.
 *
 * The values here are what the `lead_source` string on a customer, job, estimate
 * or lead is drawn from, and what Find Leads filters by. Each entry carries an
 * `editable` flag: the built-in sources cannot be renamed.
 */
interface Input {
  q?: string;
  page?: number;
  pageSize?: number;
  sortDirection?: string;
  companyId?: string;
}

const leadSourceList: ActionDefinition<Input, NormalizedList> = {
  key: "lead-source-list",
  type: "read",
  resource: "lead",
  title: "Get Lead Sources",
  description:
    "List the available lead sources. `editable` is false for Housecall Pro's built-in ones.",
  params: [
    { key: "q", label: "Search", type: "string", hint: "Matches a lead source by name." },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Lead sources"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/lead_sources", "lead_sources", {
      companyId: input.companyId,
      query: {
        q: input.q,
        page: input.page,
        page_size: input.pageSize,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default leadSourceList;
