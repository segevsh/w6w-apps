import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  jobId: string;
  limit?: number;
  offset?: number;
}

const youtubeBatchGet: ActionDefinition<Input> = {
  key: "youtube-batch-get",
  type: "read",
  resource: "youtube",
  title: "Get YouTube Batch",
  description:
    "Get the status and a page of results of a transcript or video-metadata batch job. Each " +
    "result carries a `videoId`, its `transcript` or `video`, and an `errorCode` when that video failed. " +
    "Polling is free.",
  params: [
    { key: "jobId", label: "Batch job id", type: "string", required: true },
    {
      key: "limit",
      label: "Results per page",
      type: "number",
      validation: { integer: true, min: 1, max: 500 },
    },
    { key: "offset", label: "Offset", type: "number", validation: { integer: true, min: 0 } },
  ],
  output: [
    { key: "status", type: "string", label: "queued, active, completed or failed" },
    { key: "results", type: "array", label: "Per-video results" },
    { key: "stats", type: "object", label: "total, succeeded, failed" },
    { key: "completedAt", type: "string", label: "Completion time (ISO 8601)" },
    { key: "errorCode", type: "string", label: "`job-expired` when the job's results are gone" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json(
      `/youtube/batch/${encodeId(requireText(input.jobId, "Batch job id"))}`,
      { query: compact({ limit: input.limit, offset: input.offset }) },
    );
  },
};

export default youtubeBatchGet;
