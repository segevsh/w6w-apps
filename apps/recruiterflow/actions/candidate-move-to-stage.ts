import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, stageOf, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
  stageId?: unknown;
  stageName?: unknown;
  jobId?: unknown;
  userId?: unknown;
}

const candidateMoveToStage: ActionDefinition<Input> = {
  key: "candidate-move-to-stage",
  type: "perform",
  title: "Move Candidate to Stage",
  description: "Move a candidate to a stage of a job, by stage id or by stage name.",
  idempotent: true,
  params: [
    { key: "id", label: "Candidate ID", type: "number", required: true },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      hint: "Destination stage id. Give this or the stage name.",
    },
    {
      key: "stageName",
      label: "Stage name",
      type: "string",
      hint: "Destination stage name; requires Job ID.",
    },
    { key: "jobId", label: "Job ID", type: "number", hint: "Required when moving by stage name." },
    { key: "userId", label: "Moved by (user ID)", type: "number" },
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
      "user_id": toInt(input.userId, "Moved by (user ID)"),
      stage: stageOf({ "id": toInt(input.stageId, "Stage ID"), "name": input.stageName }),
    });
    const res = await call(ctx, "/candidate/move-to-stage", { method: "POST", body });
    return asObject(res);
  },
};

export default candidateMoveToStage;
