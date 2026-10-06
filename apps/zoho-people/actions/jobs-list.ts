import type { ActionDefinition } from "@w6w/types";
import { peopleGet, requirePositiveLimit } from "../lib/people.ts";
import { limitParam, resultOutput, userParam } from "../lib/params.ts";

interface Input {
  assignedTo: string;
  jobStatus?: string;
  projectId?: string;
  clientId?: string;
  sIndex?: number;
  limit?: number;
}

const jobsList: ActionDefinition<Input> = {
  key: "jobs-list",
  type: "read",
  resource: "timesheet",
  title: "List Time Tracker Jobs",
  description: "List time-tracker jobs assigned to a user (the `jobId` values Add Time Log needs).",
  params: [
    {
      ...userParam(true, "`all`, an email, an Employee ID or an erecno."),
      key: "assignedTo",
      label: "Assigned to",
    },
    {
      key: "jobStatus",
      label: "Job status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "in-progress", label: "In progress" },
        { value: "completed", label: "Completed" },
      ],
    },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "sIndex", label: "Start index", type: "number", default: 0, hint: "0-based." },
    limitParam,
  ],
  output: resultOutput,

  async execute(input, ctx) {
    if (!input.assignedTo) throw new Error("`assignedTo` is required.");
    return await peopleGet(ctx, "/timetracker/getjobs", {
      assignedTo: input.assignedTo,
      jobStatus: input.jobStatus,
      projectId: input.projectId,
      clientId: input.clientId,
      sIndex: input.sIndex,
      limit: requirePositiveLimit(input.limit),
    });
  },
};

export default jobsList;
