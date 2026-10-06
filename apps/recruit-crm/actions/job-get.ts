import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  jobId: string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Fetch one job by id (`GET /v1/jobs/{id}`).",
  params: [slugParam("jobId", "Job id", "job")],
  output: [{ key: "name", type: "string", label: "Job name" }, {
    key: "job_status",
    type: "number",
    label: "Job status",
  }, { key: "city", type: "string", label: "City" }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/jobs/${encodeId(input.jobId)}`);
  },
};

export default jobGet;
