import type { ActionDefinition } from "@w6w/types";
import { dateTimeTimeZone, GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskOutput, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  completedDateTime?: string;
  timeZone?: string;
}

/**
 * Mark a task done — `PATCH .../tasks/{id}` with `status: "completed"`.
 * https://learn.microsoft.com/en-us/graph/api/todotask-update?view=graph-rest-1.0
 *
 * There is no dedicated "complete" endpoint on the To Do API. The deprecated
 * Outlook tasks API had one (`POST /outlooktasks/{id}/complete`) and it died
 * with the rest of that API in August 2022; on `todoTask`, completion is a field.
 *
 * This exists as its own action because "mark this done" is the single most
 * common thing a workflow wants from a task app, and routing it through Update
 * Task means the author hand-typing an enum value. To reopen a task, use Update
 * Task with status `notStarted`.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const completeTask: ActionDefinition<Input> = {
  key: "complete-task",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task as completed. Use Update Task with status `notStarted` to reopen one.",
  // Completing an already-completed task leaves it completed.
  idempotent: true,
  params: [
    taskListParam,
    taskParam,
    {
      key: "completedDateTime",
      label: "Completed at",
      type: "datetime",
      hint: "Omit to let Graph stamp the completion time itself.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      advanced: true,
      default: "UTC",
      hint: "Applies to 'Completed at'. Ignored when that field is empty.",
    },
  ],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const body: Record<string, unknown> = { status: "completed" };
    if (input.completedDateTime !== undefined) {
      body.completedDateTime = dateTimeTimeZone(input.completedDateTime, input.timeZone);
    }
    return client.request(taskPath(input.taskList, input.task), { method: "PATCH", body });
  },
};

export default completeTask;
