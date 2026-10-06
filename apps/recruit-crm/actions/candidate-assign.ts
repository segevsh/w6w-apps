import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  candidateId: string;
  jobId: string;
}

const candidateAssign: ActionDefinition<Input> = {
  key: "candidate-assign",
  type: "perform",
  resource: "candidate",
  title: "Assign Candidate to Job",
  description: "Assign a candidate to a job (`POST /v1/candidates/{id}/assign?job_slug=…`).",
  idempotent: false,
  params: [
    slugParam("candidateId", "Candidate id", "candidate"),
    slugParam("jobId", "Job id", "job"),
  ],
  output: [{ key: "candidate_slug", type: "number", label: "Candidate id" }, {
    key: "job_slug",
    type: "number",
    label: "Job id",
  }, { key: "status", type: "object", label: "Hiring stage" }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/candidates/${encodeId(input.candidateId)}/assign`, {
      method: "POST",
      query: { job_slug: encodeId(input.jobId) },
    });
  },
};

export default candidateAssign;
