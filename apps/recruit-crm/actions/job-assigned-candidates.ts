import type { ActionDefinition } from "@w6w/types";
import { encodeId, pageOf, RecruitClient } from "../lib/client.ts";
import {
  type ListInput,
  listQuery,
  pageOutput,
  paginationParams,
  slugParam,
} from "../lib/params.ts";

interface Input extends ListInput {
  jobId: string;
}

const jobAssignedCandidates: ActionDefinition<Input> = {
  key: "job-assigned-candidates",
  type: "search",
  resource: "job",
  title: "List Candidates Assigned to Job",
  description:
    "List the candidates assigned to a job (`GET /v1/jobs/{id}/assigned-candidates`), one page at a time.",
  params: [slugParam("jobId", "Job id", "job"), ...paginationParams],
  output: [...pageOutput],

  async execute(input, ctx) {
    const raw = await new RecruitClient(ctx).json(
      `/jobs/${encodeId(input.jobId)}/assigned-candidates`,
      { query: listQuery(input) },
    );
    return pageOf(raw as never);
  },
};

export default jobAssignedCandidates;
