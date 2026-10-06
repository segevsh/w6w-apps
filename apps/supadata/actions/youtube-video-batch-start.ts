import type { ActionDefinition } from "@w6w/types";
import { SupadataClient } from "../lib/client.ts";
import { batchSource, batchSourceParams } from "../lib/batch.ts";
import type { BatchSource } from "../lib/batch.ts";

const youtubeVideoBatchStart: ActionDefinition<BatchSource> = {
  key: "youtube-video-batch-start",
  type: "perform",
  idempotent: false,
  resource: "youtube",
  title: "Start YouTube Video Metadata Batch",
  description:
    "Create a batch job that fetches metadata for a list of videos, a playlist or a channel. " +
    "Returns a job id to poll with Get YouTube Batch.",
  params: batchSourceParams,
  output: [{ key: "jobId", type: "string", label: "Batch job id" }],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/video/batch", {
      method: "POST",
      body: batchSource(input),
    });
  },
};

export default youtubeVideoBatchStart;
