import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type TaskFields, taskPath, taskPayload } from "../lib/client.ts";
import { taskFieldParams, taskListParam, taskOutput, taskParam } from "../lib/params.ts";

interface Input extends TaskFields {
  taskList: string;
  task: string;
}

/**
 * `PATCH /me/todo/lists/{todoTaskListId}/tasks/{todoTaskId}`
 * https://learn.microsoft.com/en-us/graph/api/todotask-update?view=graph-rest-1.0
 *
 * A true partial update: only the fields the caller actually set are sent, so an
 * unset field is left alone rather than cleared. That is what `taskPayload`'s
 * `compact()` guarantees, and it is the difference between "change the due date"
 * and "wipe the notes".
 *
 * There is no cross-list move on this endpoint. Graph's own note on
 * `todoTask.id` — "this value changes when the item is moved from one list to
 * another" — describes what the To Do *clients* do, not an API a caller can
 * reach; moving a task through this API means Create Task in the target list
 * followed by Delete Task.
 *
 * Response is `200 OK` with the updated task.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task. Only the fields you set are sent, so the rest are left untouched.",
  // Re-applying the same field values converges on the same task.
  idempotent: true,
  params: [
    taskListParam,
    taskParam,
    { key: "title", label: "Title", type: "string" },
    ...taskFieldParams(),
  ],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(taskPath(input.taskList, input.task), {
      method: "PATCH",
      body: taskPayload(input),
    });
  },
};

export default updateTask;
