import type { ActionDefinition } from "@w6w/types";
import { projectTaskPath, TickTickClient } from "../lib/client.ts";
import { acceptedOutput, projectParam, taskParam } from "../lib/params.ts";

/**
 * `POST /open/v1/project/{projectId}/task/{taskId}/complete` — mark a task done.
 *
 * A dedicated endpoint, not a field write — which is unusual enough to be worth
 * saying, because the sibling task APIs in this pack do it the other way
 * (Microsoft Graph and Google Tasks both complete a task by PATCHing `status`).
 *
 * Documented as `200 OK` with schema **No Content**, so this routes through
 * `status()`. TickTick does not return the completed task; if you need its
 * `completedTime`, follow with Get Task.
 *
 * **There is no un-complete endpoint.** Reopening a completed task is not
 * expressible in the Open API: this endpoint only sets `status: 2`, Update Task
 * does not document `status` as a writable field, and there is no
 * `/uncomplete`. That gap is real and is recorded in the README.
 *
 * Idempotent: completing an already-completed task leaves the same world.
 */
const completeTask: ActionDefinition<{ projectId: string; taskId: string }, { status: number }> = {
  key: "complete-task",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description:
    "Mark a task complete. TickTick exposes no matching un-complete endpoint, so this is one-way through the API.",
  idempotent: true,
  params: [projectParam, taskParam],
  output: acceptedOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.status(`${projectTaskPath(input.projectId, input.taskId)}/complete`, {
      method: "POST",
    });
  },
};

export default completeTask;
