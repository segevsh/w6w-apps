import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  tasklistId: string;
}

const tasklistDelete: ActionDefinition<Input> = {
  key: "tasklist-delete",
  type: "perform",
  resource: "tasklist",
  title: "Delete Task List",
  description: "Delete a task list.",
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
  ],
  output: [{ key: "deleted", type: "boolean", label: "True once the vendor confirmed the delete" }],

  async execute(input, ctx) {
    await new ProjectsClient(ctx).request(
      "DELETE",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasklists/${
        enc(input.tasklistId)
      }`,
    );
    return { deleted: true };
  },
};

export default tasklistDelete;
