import type { ActionDefinition } from "@w6w/types";
import { projectTaskPath, TickTickClient } from "../lib/client.ts";
import { projectParam, taskOutput, taskParam } from "../lib/params.ts";

/**
 * `GET /open/v1/project/{projectId}/task/{taskId}` — one task.
 *
 * Both ids are required, and that is not redundancy: a task is addressed
 * *through* its project in this API, and there is no `GET /task/{taskId}`. If
 * you hold a task id but not its project id, the only documented way to recover
 * one is **Filter Tasks**, whose results carry `projectId` on every row.
 *
 * The response includes `items` — the task's subtasks, inline. There is no
 * separate subtask endpoint, so this is how you read them.
 */
const getTask: ActionDefinition<{ projectId: string; taskId: string }> = {
  key: "get-task",
  type: "read",
  resource: "task",
  title: "Get Task",
  description:
    "Fetch one task, including its subtasks. Needs both the project id and the task id — there is no task-only address in this API.",
  params: [projectParam, taskParam],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(projectTaskPath(input.projectId, input.taskId));
  },
};

export default getTask;
