import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { dateParam, idParam } from "../lib/params.ts";

/**
 * `PUT /job_milestones/{job_milestone_id}` — rename or redate a milestone.
 *
 * `jobId` and `jobItemId` are read-only; a milestone cannot be moved to another
 * job or item through the API.
 */
interface Input {
  jobMilestoneId: number;
  name?: string;
  date?: string;
}

const jobMilestoneUpdate: ActionDefinition<Input> = {
  key: "job-milestone-update",
  type: "perform",
  resource: "job-milestone",
  title: "Update Job Milestone",
  description: "Update a milestone's name or date.",
  idempotent: true,
  params: [
    idParam("jobMilestoneId", "Job Milestone ID"),
    { key: "name", label: "Name", type: "string" },
    dateParam("date", "Date"),
  ],
  output: [
    { key: "id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Milestone name" },
    { key: "date", type: "string", label: "Date" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_milestones/${encodeId(input.jobMilestoneId)}`,
      { method: "PUT", body: compact({ name: input.name, date: input.date }) },
    );
  },
};

export default jobMilestoneUpdate;
