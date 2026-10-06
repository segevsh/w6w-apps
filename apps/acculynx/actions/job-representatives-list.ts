import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  jobId: string;
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "job-representatives-list",
  type: "read",
  resource: "job",
  title: "List Job Representatives",
  description:
    "List the users assigned to a job: company representative, sales owner, A/R owner and additional representatives.",
  params: [
    idParam("jobId", "Job id"),
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/jobs/${encodeId(input.jobId)}/representatives`,
      pageQuery(input, "recordStartIndex"),
    );
  },
};

export default action;
