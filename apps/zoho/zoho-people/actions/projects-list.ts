import type { ActionDefinition } from "@w6w/types";
import { peopleGet, requirePositiveLimit } from "../lib/people.ts";
import { limitParam, resultOutput } from "../lib/params.ts";

interface Input {
  assignedTo?: string;
  clientId?: string;
  projectStatus?: string;
  projectManager?: string;
  sIndex?: number;
  limit?: number;
}

const projectsList: ActionDefinition<Input> = {
  key: "projects-list",
  type: "read",
  resource: "timesheet",
  title: "List Time Tracker Projects",
  description: "List time-tracker projects, optionally for one user, client, status or manager.",
  params: [
    {
      key: "assignedTo",
      label: "Assigned to",
      type: "string",
      hint: "`all`, an email, an Employee ID or an erecno. Defaults to the connected user.",
    },
    { key: "clientId", label: "Client ID", type: "string" },
    {
      key: "projectStatus",
      label: "Project status",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "inprogress", label: "In progress" },
        { value: "completed", label: "Completed" },
      ],
    },
    { key: "projectManager", label: "Project manager", type: "string" },
    { key: "sIndex", label: "Start index", type: "number", default: 0, hint: "0-based." },
    limitParam,
  ],
  output: resultOutput,

  async execute(input, ctx) {
    return await peopleGet(ctx, "/timetracker/getprojects", {
      assignedTo: input.assignedTo,
      clientId: input.clientId,
      projectStatus: input.projectStatus,
      projectManager: input.projectManager,
      sIndex: input.sIndex,
      limit: requirePositiveLimit(input.limit),
    });
  },
};

export default projectsList;
