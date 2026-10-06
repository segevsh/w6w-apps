import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";

/**
 * `GET /v1/jobs/{jobId}` — one asynchronous capture job (a batch member). Status is
 * queued, processing, completed or failed; `resultUrl` (signed, no key needed) is set on
 * completion and `error` on failure.
 */
interface Input {
  jobId: string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Read the status and result URL of one asynchronous capture job.",
  params: [{ key: "jobId", label: "Job ID", type: "string", required: true }],
  output: [
    { key: "jobId", type: "string", label: "Job id" },
    { key: "status", type: "string", label: "queued, processing, completed or failed" },
    { key: "resultUrl", type: "string", label: "Signed download URL" },
    { key: "error", type: "string", label: "Failure reason" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "completedAt", type: "string", label: "Completed at" },
  ],

  execute(input, ctx) {
    const id = encodeId(input.jobId);
    if (!id) throw new Error("Job ID is required");
    return new RendexClient(ctx).json(`/jobs/${id}`);
  },
};

export default jobGet;
