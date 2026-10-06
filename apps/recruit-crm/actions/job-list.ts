import type { ActionDefinition } from "@w6w/types";
import { pageOf, RecruitClient } from "../lib/client.ts";
import { type ListInput, listQuery, pageOutput, paginationParams } from "../lib/params.ts";

interface Input extends ListInput {
  sortBy?: string;
  sortOrder?: string;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List jobs, one page at a time (`GET /v1/jobs`).",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "Sorting key; the spec documents the parameter but no value list.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "string",
      hint: "Sort direction; the spec documents the parameter but no value list.",
    },
    ...paginationParams,
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    const raw = await new RecruitClient(ctx).json("/jobs", {
      query: { ...listQuery(input), sort_by: input.sortBy, sort_order: input.sortOrder },
    });
    return pageOf(raw as never);
  },
};

export default jobList;
