import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  taskId: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task.",
  params: [
    portalId,
    projectId,
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the List Tasks action.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasks/${enc(input.taskId)}`,
    );
    return { item: body };
  },
};

export default taskGet;
