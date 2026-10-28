import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  tasklistId: string;
  name?: string;
  milestoneId?: string;
  flag?: string;
  status?: string;
}

const tasklistUpdate: ActionDefinition<Input> = {
  key: "tasklist-update",
  type: "perform",
  resource: "tasklist",
  title: "Update Task List",
  description: "Rename a task list or change its milestone, visibility or status.",
  idempotent: true,
  params: [
    portalId,
    projectId,
    {
      key: "tasklistId",
      label: "Task List ID",
      type: "string",
      required: true,
      hint: "From the List Task Lists action.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "milestoneId", label: "Milestone ID", type: "string" },
    {
      key: "flag",
      label: "Visibility",
      type: "select",
      hint: "internal (team only) or external.",
      options: [{ value: "internal", label: "Internal" }, { value: "external", label: "External" }],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }],
    },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "PATCH",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasklists/${
        enc(input.tasklistId)
      }`,
      {
        body: compact({
          name: input.name,
          milestone: input.milestoneId ? { id: input.milestoneId } : undefined,
          flag: input.flag,
          status: input.status,
        }),
      },
    );
    return { item: body };
  },
};

export default tasklistUpdate;
