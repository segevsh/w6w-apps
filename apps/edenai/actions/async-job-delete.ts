import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/** `DELETE /v3/universal-ai/async/{job_id}` - only your own jobs. */
interface Input {
  jobId: string;
}

const asyncJobDelete: ActionDefinition<Input> = {
  key: "async-job-delete",
  type: "perform",
  resource: "async-job",
  title: "Delete Async Job",
  description: "Delete an async Universal AI job and its stored result.",
  idempotent: true,
  params: [{ key: "jobId", label: "Job ID", type: "string", required: true }],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new EdenClient(ctx).json(`/universal-ai/async/${encodeURIComponent(input.jobId)}`, {
      method: "DELETE",
    });
    return { jobId: input.jobId, deleted: true };
  },
};

export default asyncJobDelete;
