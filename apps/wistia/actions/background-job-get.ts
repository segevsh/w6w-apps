import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const backgroundJobGet: ActionDefinition<Input> = {
  key: "background-job-get",
  type: "read",
  resource: "background-job",
  title: "Get Background Job",
  description:
    "Poll an asynchronous job started by Import Media from URL or Move Media: queued, started, " +
    "finished or failed.",
  params: [{
    key: "jobId",
    label: "Background job ID",
    type: "string",
    required: true,
    hint:
      "The hashed_id (or numeric id) from background_job_status in the starting action's result.",
  }],
  output: [
    { key: "background_job_status", type: "object", label: "id, hashed_id, status and object" },
  ],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/background_job_status/${encodeId(input.jobId)}`);
  },
};

export default backgroundJobGet;
