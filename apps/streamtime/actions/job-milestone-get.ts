import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_milestones/{job_milestone_id}` — one milestone. */
interface Input {
  jobMilestoneId: number;
}

const jobMilestoneGet: ActionDefinition<Input> = {
  key: "job-milestone-get",
  type: "read",
  resource: "job-milestone",
  title: "Get Job Milestone",
  description: "Fetch one job milestone by id.",
  params: [idParam("jobMilestoneId", "Job Milestone ID")],
  output: [
    { key: "id", type: "number", label: "Milestone ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobItemId", type: "number", label: "Job item ID, when the milestone is item-level" },
    { key: "name", type: "string", label: "Milestone name" },
    { key: "date", type: "string", label: "Date" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_milestones/${encodeId(input.jobMilestoneId)}`);
  },
};

export default jobMilestoneGet;
