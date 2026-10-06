import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  jobId: string;
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "job-estimates-list",
  type: "read",
  resource: "estimate",
  title: "List Job Estimates",
  description: "List a job's estimates (ids and links; use Get Estimate for the totals).",
  params: [
    idParam("jobId", "Job id"),
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/jobs/${encodeId(input.jobId)}/estimates`,
      pageQuery(input, "recordStartIndex"),
    );
  },
};

export default action;
