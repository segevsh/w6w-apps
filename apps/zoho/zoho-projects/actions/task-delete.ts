import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  taskId: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task.",
  idempotent: true,
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
  output: [{ key: "deleted", type: "boolean", label: "True once the vendor confirmed the delete" }],

  async execute(input, ctx) {
    await new ProjectsClient(ctx).request(
      "DELETE",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasks/${enc(input.taskId)}`,
    );
    return { deleted: true };
  },
};

export default taskDelete;
