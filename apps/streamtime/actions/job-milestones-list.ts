import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /jobs/{job_id}/job_milestones` — a job's milestones. */
interface Input {
  jobId: number;
}

const jobMilestonesList: ActionDefinition<Input> = {
  key: "job-milestones-list",
  type: "search",
  resource: "job-milestone",
  title: "List Job Milestones",
  description: "List a job's milestones.",
  params: [idParam("jobId", "Job ID")],
  output: [
    {
      key: "milestones",
      type: "array",
      label: "Milestones — `{ id, jobId, jobItemId, name, date }`",
    },
  ],

  async execute(input, ctx) {
    const milestones = await new StreamtimeClient(ctx).request<unknown[]>(
      `/jobs/${encodeId(input.jobId)}/job_milestones`,
    );
    return { milestones: milestones ?? [] };
  },
};

export default jobMilestonesList;
