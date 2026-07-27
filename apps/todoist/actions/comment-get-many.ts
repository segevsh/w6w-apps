import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId?: string;
  projectId?: string;
}

/**
 * GET /comments — list the comments on a task or a project. Todoist requires
 * exactly one of the two, so this rejects a call that names neither.
 */
const commentGetMany: ActionDefinition<Input> = {
  key: "comment-get-many",
  type: "read",
  resource: "comment",
  title: "Get Many Comments",
  description: "List the comments on a task or a project.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      hint: "List a task's comments. Set this OR Project ID.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "List a project's comments. Set this OR Task ID.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Comments" },
  ],

  execute(input, ctx) {
    if (!input.taskId && !input.projectId) {
      throw new Error("comment-get-many requires either taskId or projectId");
    }
    const client = new TodoistClient(ctx);
    return client.request("/comments", {
      query: { task_id: input.taskId, project_id: input.projectId },
    });
  },
};

export default commentGetMany;
