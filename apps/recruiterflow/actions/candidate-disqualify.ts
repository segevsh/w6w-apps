import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
  jobId?: unknown;
  reason?: unknown;
  userId?: unknown;
}

const candidateDisqualify: ActionDefinition<Input> = {
  key: "candidate-disqualify",
  type: "perform",
  title: "Disqualify Candidate",
  description: "Disqualify a candidate from a job with a reason.",
  idempotent: true,
  params: [
    { key: "id", label: "Candidate ID", type: "number", required: true },
    { key: "jobId", label: "Job ID", type: "number", required: true },
    { key: "reason", label: "Reason", type: "string", required: true },
    { key: "userId", label: "Disqualified by (user ID)", type: "number" },
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
      "reason": input.reason,
      "user_id": toInt(input.userId, "Disqualified by (user ID)"),
    });
    const res = await call(ctx, "/candidate/disqualify", { method: "POST", body });
    return asObject(res);
  },
};

export default candidateDisqualify;
