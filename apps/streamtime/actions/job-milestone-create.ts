import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { dateParam, idParam } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/job_milestones` — add a milestone to a job.
 *
 * `jobItemId` is read-only on the model, so a milestone created through this
 * route is attached to the job, not to a job item.
 */
interface Input {
  jobId: number;
  name: string;
  date?: string;
}

const jobMilestoneCreate: ActionDefinition<Input> = {
  key: "job-milestone-create",
  type: "perform",
  resource: "job-milestone",
  title: "Create Job Milestone",
  description: "Create a milestone on a job.",
  idempotent: false,
  params: [
    idParam("jobId", "Job ID"),
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "Client Presentation",
    },
    dateParam("date", "Date", "YYYY-MM-DD, the format the spec documents."),
  ],
  output: [
    { key: "id", type: "number", label: "New milestone ID" },
    { key: "name", type: "string", label: "Milestone name" },
    { key: "date", type: "string", label: "Date" },
    { key: "jobId", type: "number", label: "Job ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}/job_milestones`, {
      method: "POST",
      body: compact({ name: input.name, date: input.date }),
    });
  },
};

export default jobMilestoneCreate;
