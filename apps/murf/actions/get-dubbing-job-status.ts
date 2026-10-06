import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const getDubbingJobStatus: ActionDefinition<Input> = {
  key: "get-dubbing-job-status",
  type: "read",
  resource: "dubbing-job",
  title: "Get Dubbing Job Status",
  description:
    "Read a Murf Dub job (GET /v1/murfdub/jobs/{job_id}/status): overall `status` and, per target locale, its own status, error and `download_url` / `download_srt_url`. Poll until the job reports COMPLETED. Needs the Murf Dub API key.",
  params: [{ key: "jobId", label: "Job ID", type: "string", required: true }],
  output: [
    { key: "job_id", type: "string", label: "Job ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "status", type: "string", label: "Job status" },
    { key: "download_details", type: "array", label: "Per-locale status and download URLs" },
    { key: "credits_used", type: "number", label: "Credits used" },
    { key: "credits_remaining", type: "number", label: "Credits remaining" },
    { key: "failure_reason", type: "string", label: "Failure reason" },
    { key: "failure_code", type: "string", label: "Failure code" },
  ],

  async execute(input, ctx) {
    if (!input.jobId?.trim()) throw new Error("jobId is required");
    return await new MurfClient(ctx).call(
      `/v1/murfdub/jobs/${encodeURIComponent(input.jobId.trim())}/status`,
    );
  },
};

export default getDubbingJobStatus;
