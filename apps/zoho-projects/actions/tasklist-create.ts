import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  name: string;
  milestoneId?: string;
  flag?: string;
  status?: string;
}

const tasklistCreate: ActionDefinition<Input> = {
  key: "tasklist-create",
  type: "perform",
  resource: "tasklist",
  title: "Create Task List",
  description: "Create a task list in a project.",
  idempotent: false,
  params: [
    portalId,
    projectId,
    { key: "name", label: "Name", type: "string", required: true },
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
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasklists`,
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

export default tasklistCreate;
