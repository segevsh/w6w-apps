import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
  jobId?: unknown;
  applied?: unknown;
}

const candidateAddToJob: ActionDefinition<Input> = {
  key: "candidate-add-to-job",
  type: "perform",
  title: "Add Candidate to Job",
  description: "Add a candidate to a job; they land in the Sourced stage unless marked applied.",
  idempotent: false,
  params: [
    { key: "id", label: "Candidate ID", type: "number", required: true },
    { key: "jobId", label: "Job ID", type: "number", required: true },
    {
      key: "applied",
      label: "Applied",
      type: "boolean",
      hint: "Off = Sourced (default). On = Applied, which triggers Welcome Mail recipes.",
    },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const body = compact({
      "id": toInt(input.id, "Candidate ID"),
      "job_id": toInt(input.jobId, "Job ID"),
      "applied": input.applied ? 1 : undefined,
    });
    const res = await call(ctx, "/candidate/add-to-job", { method: "POST", body });
    return asObject(res);
  },
};

export default candidateAddToJob;
