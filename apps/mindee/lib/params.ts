import type { Param } from "@w6w/types";

/** The id every `*-result-get` action keys its lookup on — same value as `job.id`. */
export const inferenceIdParam: Param = {
  key: "inferenceId",
  label: "Inference / Job ID",
  type: "string",
  required: true,
  hint: "The `id` from the matching enqueue action's returned job (also `job.id` from " +
    "Job Status). The inference is only available once the job's status is `Processed`.",
};

/** The id `GET /v2/jobs/{job_id}` polls. */
export const jobIdParam: Param = {
  key: "jobId",
  label: "Job ID",
  type: "string",
  required: true,
  hint: "The `id` returned by an enqueue action's job.",
};
