import type { ActionDefinition } from "@w6w/types";
import { encodeId, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const extractJobGet: ActionDefinition<Input> = {
  key: "extract-job-get",
  type: "read",
  resource: "extract",
  title: "Get Extraction Job",
  description:
    "Poll a video-extraction job. `status` is `queued`, `active`, `completed` or `failed`; the " +
    "extracted `data` is present once completed. Polling is free.",
  params: [{ key: "jobId", label: "Job id", type: "string", required: true }],
  output: [
    { key: "status", type: "string", label: "queued, active, completed or failed" },
    { key: "data", type: "object", label: "Extracted data, once completed" },
    { key: "schema", type: "object", label: "The schema used" },
    { key: "error", type: "object", label: "Vendor error, when failed" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json(
      `/extract/${encodeId(requireText(input.jobId, "Job id"))}`,
    );
  },
};

export default extractJobGet;
