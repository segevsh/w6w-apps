import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  candidateId: string;
  jobId: string;
  statusId: number;
  statusLabel?: string;
  remark?: string;
  stageDate?: string;
  visibility?: number;
}

const candidateHiringStageUpdate: ActionDefinition<Input> = {
  key: "candidate-hiring-stage-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate Hiring Stage",
  description:
    "Move a candidate to another hiring stage for a job (`POST /v1/candidates/{id}/hiring-stages/{job}`). " +
    "Stage ids come from the Hiring Pipeline action.",
  idempotent: true,
  params: [
    slugParam("candidateId", "Candidate id", "candidate"),
    slugParam("jobId", "Job id", "job"),
    {
      key: "statusId",
      label: "Stage id",
      type: "number",
      required: true,
      hint: "`stage_id` from the Hiring Pipeline action.",
    },
    {
      key: "statusLabel",
      label: "Stage label",
      type: "string",
      hint: "Optional; the spec's example sends the label beside the id.",
    },
    { key: "remark", label: "Remark", type: "text" },
    { key: "stageDate", label: "Stage date", type: "string", hint: "ISO-8601 date/time." },
    {
      key: "visibility",
      label: "Visible in job",
      type: "number",
      hint: "1 = on, 0 = off (the candidate's visibility in the job).",
    },
  ],
  output: [
    { key: "candidate_slug", type: "number", label: "Candidate id" },
    { key: "job_slug", type: "number", label: "Job id" },
    { key: "status", type: "object", label: "Hiring stage" },
    { key: "remark", type: "string", label: "Remark" },
    { key: "stage_date", type: "string", label: "Stage date" },
  ],

  execute(input, ctx) {
    const candidate = encodeId(input.candidateId);
    const job = encodeId(input.jobId);
    if (input.statusId === undefined || input.statusId === null) {
      throw new Error("statusId is required");
    }
    return new RecruitClient(ctx).json(`/candidates/${candidate}/hiring-stages/${job}`, {
      method: "POST",
      body: compact({
        status: compact({ status_id: Number(input.statusId), label: input.statusLabel }),
        remark: input.remark,
        stage_date: input.stageDate,
        visibility: input.visibility,
      }),
    });
  },
};

export default candidateHiringStageUpdate;
