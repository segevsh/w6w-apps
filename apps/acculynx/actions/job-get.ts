import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, includesParam } from "../lib/params.ts";

interface Input {
  jobId: string;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Get one job by id. Unassigned leads are not returned by this endpoint.",
  params: [
    idParam("jobId", "Job id"),
    includesParam("contact, initialAppointment"),
  ],
  output: [
    { key: "id", type: "string", label: "Job id" },
    { key: "jobNumber", type: "string", label: "Job number" },
    { key: "jobName", type: "string", label: "Job name" },
    { key: "currentMilestone", type: "string", label: "Current milestone" },
    { key: "locationAddress", type: "object", label: "Location address" },
    { key: "contacts", type: "array", label: "Job contacts" },
    { key: "createdDate", type: "string", label: "Created (ISO 8601)" },
    { key: "modifiedDate", type: "string", label: "Modified (ISO 8601)" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/jobs/${encodeId(input.jobId)}`, {
      includes: input.includes,
    });
  },
};

export default action;
