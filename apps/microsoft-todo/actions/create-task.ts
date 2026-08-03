import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type TaskFields, taskPayload, tasksPath } from "../lib/client.ts";
import { taskFieldParams, taskListParam, taskOutput } from "../lib/params.ts";

interface Input extends TaskFields {
  taskList: string;
  title: string;
}

/**
 * `POST /me/todo/lists/{todoTaskListId}/tasks`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks?view=graph-rest-1.0
 *
 * A task must live in a list — there is no listless task in the To Do model —
 * so `taskList` is required alongside `title`.
 *
 * Graph's own example creates a task with a `linkedResources` array inline, and
 * that is genuinely useful (it is how a task points back at the thing that
 * caused it). It is deliberately **not** folded in here: the nested-array form
 * would duplicate the Create Linked Resource action's fields with different
 * validation, and the two-step version is inspectable in a workflow graph.
 *
 * Response is `201 Created` with the new `todoTask`.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a To Do list.",
  // Graph mints a fresh id per call, so a retry creates a duplicate task.
  idempotent: false,
  params: [
    taskListParam,
    { key: "title", label: "Title", type: "string", required: true },
    ...taskFieldParams(),
  ],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(tasksPath(input.taskList), {
      method: "POST",
      body: taskPayload(input),
    });
  },
};

export default createTask;
