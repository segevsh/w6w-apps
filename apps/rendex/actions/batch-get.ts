import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";

/**
 * `GET /v1/batches/{batchId}` — batch status with every job. Returns `batchId, status,
 * totalJobs, completedJobs, failedJobs, createdAt, completedAt, jobs[{jobId, status,
 * resultUrl, error, ...}]`; `resultUrl` is a signed, key-less download link.
 */
interface Input {
  batchId: string;
}

const batchGet: ActionDefinition<Input> = {
  key: "batch-get",
  type: "read",
  resource: "batch",
  title: "Get Batch",
  description: "Read a screenshot batch's progress and each job's result URL.",
  params: [{ key: "batchId", label: "Batch ID", type: "string", required: true }],
  output: [
    { key: "batchId", type: "string", label: "Batch id" },
    { key: "status", type: "string", label: "Batch status" },
    { key: "totalJobs", type: "number", label: "Total jobs" },
    { key: "completedJobs", type: "number", label: "Completed jobs" },
    { key: "failedJobs", type: "number", label: "Failed jobs" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "completedAt", type: "string", label: "Completed at" },
    { key: "jobs", type: "array", label: "Jobs with status and resultUrl" },
  ],

  execute(input, ctx) {
    const id = encodeId(input.batchId);
    if (!id) throw new Error("Batch ID is required");
    return new RendexClient(ctx).json(`/batches/${id}`);
  },
};

export default batchGet;
