import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  candidateId: string;
  jobId: string;
}

const candidateUnassign: ActionDefinition<Input> = {
  key: "candidate-unassign",
  type: "perform",
  resource: "candidate",
  title: "Unassign Candidate from Job",
  description:
    "Remove a candidate from a job and return the candidate (`POST /v1/candidates/{id}/unassign?job_slug=…`).",
  idempotent: false,
  params: [
    slugParam("candidateId", "Candidate id", "candidate"),
    slugParam("jobId", "Job id", "job"),
  ],
  output: [{ key: "first_name", type: "string", label: "First name" }, {
    key: "last_name",
    type: "string",
    label: "Last name",
  }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/candidates/${encodeId(input.candidateId)}/unassign`, {
      method: "POST",
      query: { job_slug: encodeId(input.jobId) },
    });
  },
};

export default candidateUnassign;
