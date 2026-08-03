import type { ActionDefinition } from "@w6w/types";
import { projectTaskPath, TickTickClient } from "../lib/client.ts";
import { acceptedOutput, projectParam, taskParam } from "../lib/params.ts";

/**
 * `DELETE /open/v1/project/{projectId}/task/{taskId}` — delete a task.
 *
 * Documented as `200 OK` with schema **No Content**, so this routes through
 * `status()`.
 *
 * TickTick's clients move a deleted task to a trash that is emptied on a
 * schedule; the Open API exposes no trash endpoint, so from a workflow's point
 * of view this is one-way. Its subtasks go with it — they are a field of the
 * task, not entities of their own.
 *
 * Idempotent for retry purposes: deleting twice leaves the same world, the
 * second call answering `404`.
 */
const deleteTask: ActionDefinition<{ projectId: string; taskId: string }, { status: number }> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description:
    "Delete a task and its subtasks. The Open API exposes no trash or restore endpoint, so treat this as one-way.",
  idempotent: true,
  params: [projectParam, taskParam],
  output: acceptedOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.status(projectTaskPath(input.projectId, input.taskId), { method: "DELETE" });
  },
};

export default deleteTask;
