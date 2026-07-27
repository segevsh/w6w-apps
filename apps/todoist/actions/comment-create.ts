import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  content: string;
  taskId?: string;
  projectId?: string;
}

/**
 * POST /comments — add a comment to a task or a project. Todoist requires
 * exactly one target, so this rejects a call that names neither.
 */
const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Add a comment to a task or a project.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true, config: { multiline: true } },
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      hint: "Comment on a task. Set this OR Project ID.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "Comment on a project. Set this OR Task ID.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
  ],

  execute(input, ctx) {
    if (!input.taskId && !input.projectId) {
      throw new Error("comment-create requires either taskId or projectId");
    }
    const client = new TodoistClient(ctx);
    const body: Record<string, unknown> = { content: input.content };
    if (input.taskId) body.task_id = input.taskId;
    else body.project_id = input.projectId;

    return client.request("/comments", { method: "POST", body });
  },
};

export default commentCreate;
