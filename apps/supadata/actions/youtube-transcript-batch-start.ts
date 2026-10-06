import type { ActionDefinition } from "@w6w/types";
import { compact, SupadataClient } from "../lib/client.ts";
import { batchSource, batchSourceParams } from "../lib/batch.ts";
import type { BatchSource } from "../lib/batch.ts";

interface Input extends BatchSource {
  lang?: string;
  text?: boolean;
}

const youtubeTranscriptBatchStart: ActionDefinition<Input> = {
  key: "youtube-transcript-batch-start",
  type: "perform",
  idempotent: false,
  resource: "youtube",
  title: "Start YouTube Transcript Batch",
  description:
    "Create a batch job that fetches transcripts for a list of videos, a playlist or a channel. " +
    "Returns a job id to poll with Get YouTube Batch. 1 credit per video, charged on submission.",
  params: [
    ...batchSourceParams,
    { key: "lang", label: "Language", type: "string", placeholder: "en" },
    { key: "text", label: "Plain text", type: "boolean", default: false },
  ],
  output: [{ key: "jobId", type: "string", label: "Batch job id" }],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/transcript/batch", {
      method: "POST",
      body: {
        ...batchSource(input),
        ...compact({ lang: input.lang?.trim(), text: input.text || undefined }),
      },
    });
  },
};

export default youtubeTranscriptBatchStart;
