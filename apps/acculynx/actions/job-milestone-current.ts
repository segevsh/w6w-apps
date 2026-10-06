import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, includesParam } from "../lib/params.ts";

interface Input {
  jobId: string;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-milestone-current",
  type: "read",
  resource: "job",
  title: "Get Current Job Milestone",
  description:
    "Get the milestone a job is in now (Lead, Prospect, Approved, Completed, Invoiced, Closed or Cancelled) with its statuses.",
  params: [
    idParam("jobId", "Job id"),
    includesParam("see AccuLynx's reference for this endpoint"),
  ],
  output: [
    { key: "id", type: "string", label: "Milestone id" },
    { key: "name", type: "string", label: "Milestone name" },
    { key: "isCurrent", type: "boolean", label: "Always true here" },
    { key: "duration", type: "object", label: "Start and end dates" },
    { key: "statuses", type: "array", label: "Statuses within the milestone" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/jobs/${encodeId(input.jobId)}/milestones/current`, {
      includes: input.includes,
    });
  },
};

export default action;
