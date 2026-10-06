import type { ActionDefinition } from "@w6w/types";
import { encodeId, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const transcriptJobGet: ActionDefinition<Input> = {
  key: "transcript-job-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript Job",
  description:
    "Poll an asynchronous transcript job started by Get Transcript. `status` is `queued`, " +
    "`active`, `completed` or `failed`; the transcript is present once completed. Polling is free.",
  params: [{ key: "jobId", label: "Job id", type: "string", required: true }],
  output: [
    { key: "status", type: "string", label: "queued, active, completed or failed" },
    { key: "content", type: "object", label: "Segments or text, once completed" },
    { key: "lang", type: "string", label: "Transcript language" },
    { key: "availableLangs", type: "array", label: "Languages on offer" },
    { key: "error", type: "object", label: "Vendor error, when failed" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json(
      `/transcript/${encodeId(requireText(input.jobId, "Job id"))}`,
    );
  },
};

export default transcriptJobGet;
